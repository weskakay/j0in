<?php

const J0IN_START_COLUMNS = ['ToDo', 'In Progress', 'Awaiting Feedback', 'Done'];
const J0IN_START_CATEGORIES = [['Technical Task', '#1FD7C1'], ['User Story', '#0038FF']];
const J0IN_GUEST_EMAIL = 'guest@j0in.local';

/** Registers a user, gives them a board and signs them in. */
function signUp(PDO $pdo, array $body): void
{
    $name = bodyString($body, 'name');
    $email = strtolower(bodyString($body, 'email'));
    $password = (string) ($body['password'] ?? '');
    if (!J0IN_SIGNUP_OPEN) {
        fail(403, 'auth.signup_closed');
    }
    requireValidSignUp($pdo, $name, $email, $password);
    reopenOrInsert($pdo, $name, $email, $password);
    notifyOwner($pdo, $name, $email);
    respond(202, ['pending' => true]);
}

/**
 * Rejects anything the sign-up form should have caught. An address that is
 * already in use is turned away; one that was declined earlier is not, it may
 * ask again and lands on the owner's desk a second time.
 */
function requireValidSignUp(PDO $pdo, string $name, string $email, string $password): void
{
    if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
        fail(422, 'auth.signup_invalid');
    }
    if (statusOf($pdo, $email) === 'approved') {
        fail(409, 'auth.email_taken');
    }
}

/** The state of an account with this address, or an empty string. */
function statusOf(PDO $pdo, string $email): string
{
    $stmt = $pdo->prepare('SELECT status FROM join_users WHERE email = ?');
    $stmt->execute([$email]);
    return (string) ($stmt->fetchColumn() ?: '');
}

/**
 * Files the request. An address that asked before is put back on the pile
 * with its new password, so a change of mind on either side is possible.
 */
function reopenOrInsert(PDO $pdo, string $name, string $email, string $password): void
{
    if (statusOf($pdo, $email) === '') {
        insertUser($pdo, $name, $email, $password, 'user', 'pending');
        return;
    }
    $stmt = $pdo->prepare(
        "UPDATE join_users SET name = ?, password_hash = ?, status = 'pending', decided_at = NULL
         WHERE email = ?"
    );
    $stmt->execute([$name, password_hash($password, PASSWORD_BCRYPT), $email]);
}

/** Stores the user with a BCRYPT hash; the plain password is never kept. */
function insertUser(
    PDO $pdo,
    string $name,
    string $email,
    string $password,
    string $role,
    string $status = 'approved'
): string {
    $id = uuid();
    $stmt = $pdo->prepare(
        'INSERT INTO join_users (id, name, email, password_hash, role, status)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$id, $name, $email, password_hash($password, PASSWORD_BCRYPT), $role, $status]);
    return $id;
}

/** Creates a board with the familiar starting columns and categories. */
function createBoardFor(PDO $pdo, string $userId, string $name, bool $isDemo): string
{
    $boardId = uuid();
    $stmt = $pdo->prepare(
        'INSERT INTO join_boards (id, owner_user_id, name, is_demo) VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$boardId, $userId, $name, $isDemo ? 1 : 0]);
    insertStartColumns($pdo, $boardId);
    insertStartCategories($pdo, $boardId);
    return $boardId;
}

/** The four columns everyone knows; they can be renamed or removed later. */
function insertStartColumns(PDO $pdo, string $boardId): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO join_columns (id, board_id, name, position) VALUES (?, ?, ?, ?)'
    );
    foreach (J0IN_START_COLUMNS as $index => $name) {
        $stmt->execute([uuid(), $boardId, $name, $index + 1]);
    }
}

/** Two starting categories, editable like the columns. */
function insertStartCategories(PDO $pdo, string $boardId): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO join_categories (id, board_id, name, color, position) VALUES (?, ?, ?, ?, ?)'
    );
    foreach (J0IN_START_CATEGORIES as $index => [$name, $color]) {
        $stmt->execute([uuid(), $boardId, $name, $color, $index + 1]);
    }
}

/** Signs a user in after verifying the password on the server. */
function signIn(PDO $pdo, array $body): void
{
    $ip = clientIp();
    requireNotBlocked($pdo, $ip);
    $email = strtolower(bodyString($body, 'email'));
    $user = findUserByEmail($pdo, $email);
    if ($user === null || !password_verify((string) ($body['password'] ?? ''), $user['password_hash'])) {
        countFailure($pdo, $ip);
        fail(401, 'auth.bad_credentials');
    }
    requireApproved($user);
    clearFailures($pdo, $ip);
    $days = ($body['remember'] ?? false) ? J0IN_DAYS_REMEMBER : 1;
    startSession($pdo, $user['id'], $days);
    respond(200, publicUser($user));
}

/** Refuses a sign-in while the account is not approved. */
function requireApproved(array $user): void
{
    $status = $user['status'] ?? 'approved';
    if ($status === 'pending') {
        fail(403, 'auth.pending');
    }
    if ($status !== 'approved') {
        fail(403, 'auth.rejected');
    }
}

/**
 * Looks a user up by email.
 *
 * @return array<string, mixed>|null
 */
function findUserByEmail(PDO $pdo, string $email): ?array
{
    $stmt = $pdo->prepare(
        'SELECT id, name, email, role, status, password_hash FROM join_users WHERE email = ?'
    );
    $stmt->execute([$email]);
    return $stmt->fetch() ?: null;
}

/** Signs in as the shared guest, creating that account on first use. */
function signInAsGuest(PDO $pdo, array $body = []): void
{
    if (!J0IN_GUEST_OPEN) {
        fail(403, 'auth.guest_closed');
    }
    $lang = bodyString($body, 'lang');
    $user = findUserByEmail($pdo, J0IN_GUEST_EMAIL);
    if ($user === null) {
        $user = createGuestAccount($pdo, $lang);
    }
    refillDemoIfEmpty($pdo, $user['id'], $lang);
    startSession($pdo, $user['id'], J0IN_DAYS_GUEST);
    respond(200, publicUser($user));
}

/**
 * Creates the guest account and its demo board.
 *
 * @return array<string, mixed>
 */
function createGuestAccount(PDO $pdo, string $lang = 'de'): array
{
    $password = bin2hex(random_bytes(16));
    $id = insertUser($pdo, 'Gast', J0IN_GUEST_EMAIL, $password, 'guest');
    createBoardFor($pdo, $id, boardNameIn($lang), true);
    return ['id' => $id, 'name' => 'Gast', 'email' => J0IN_GUEST_EMAIL, 'role' => 'guest'];
}

/**
 * Puts the demo cards back whenever the guest board stands empty. That covers
 * the very first visitor as well as the one who arrives after someone before
 * them deleted everything.
 */
function refillDemoIfEmpty(PDO $pdo, string $userId, string $lang = 'de'): void
{
    $stmt = $pdo->prepare(
        'SELECT b.id, COUNT(t.id) AS cards
         FROM join_boards b
         LEFT JOIN join_columns c ON c.board_id = b.id
         LEFT JOIN join_tasks t ON t.column_id = c.id
         WHERE b.owner_user_id = ?
         GROUP BY b.id LIMIT 1'
    );
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    if ($row && (int) $row['cards'] === 0) {
        fillDemoBoard($pdo, (string) $row['id'], $lang);
    }
}

/**
 * Strips the password hash before anything leaves the server.
 *
 * @return array<string, mixed>
 */
function publicUser(array $user): array
{
    return [
        'id'      => $user['id'],
        'name'    => $user['name'],
        'email'   => $user['email'],
        'role'    => $user['role'],
        'pending' => ($user['role'] ?? '') === 'owner' ? countPending(db()) : 0,
    ];
}
