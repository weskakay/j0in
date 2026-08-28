<?php

const J0IN_COOKIE = 'j0in_session';
const J0IN_DAYS_REMEMBER = 30;
const J0IN_DAYS_GUEST = 1;

/**
 * Creates a session row and sends the cookie holding the raw token.
 * Only the hash of the token is stored, so a database leak reveals nothing.
 *
 * @param int $days how long the session stays valid
 */
function startSession(PDO $pdo, string $userId, int $days): void
{
    $token = bin2hex(random_bytes(32));
    $expires = new DateTimeImmutable("+{$days} days");
    $stmt = $pdo->prepare(
        'INSERT INTO join_sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([uuid(), $userId, hash('sha256', $token), $expires->format('Y-m-d H:i:s')]);
    sendCookie($token, $expires);
}

/** Sends the session cookie; JavaScript can never read it. */
function sendCookie(string $token, DateTimeImmutable $expires): void
{
    setcookie(J0IN_COOKIE, $token, [
        'expires'  => $expires->getTimestamp(),
        'path'     => '/',
        'secure'   => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

/**
 * Returns the signed-in user, or null when there is no valid session.
 *
 * @return array<string, mixed>|null
 */
function currentUser(PDO $pdo): ?array
{
    $token = $_COOKIE[J0IN_COOKIE] ?? '';
    if ($token === '') {
        return null;
    }
    $stmt = $pdo->prepare(
        'SELECT u.id, u.name, u.email, u.role FROM join_sessions s
         JOIN join_users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > NOW()'
    );
    $stmt->execute([hash('sha256', $token)]);
    return $stmt->fetch() ?: null;
}

/** Deletes the current session row and clears the cookie. */
function endSession(PDO $pdo): void
{
    $token = $_COOKIE[J0IN_COOKIE] ?? '';
    if ($token !== '') {
        $stmt = $pdo->prepare('DELETE FROM join_sessions WHERE token_hash = ?');
        $stmt->execute([hash('sha256', $token)]);
    }
    sendCookie('', new DateTimeImmutable('-1 day'));
}

/** Returns the signed-in user or ends the request with 401. */
function requireUser(PDO $pdo): array
{
    $user = currentUser($pdo);
    if ($user === null) {
        fail(401, 'Not signed in');
    }
    return $user;
}

/**
 * The board that belongs to the signed-in user.
 * Every read and write is scoped through this, so nobody can reach a
 * board that is not theirs.
 */
function requireBoardId(PDO $pdo, string $userId): string
{
    $stmt = $pdo->prepare('SELECT id FROM join_boards WHERE owner_user_id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $id = $stmt->fetchColumn();
    if ($id === false) {
        fail(404, 'No board for this account');
    }
    return (string) $id;
}
