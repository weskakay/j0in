<?php

/**
 * Requests for access, and the decisions about them.
 *
 * Signing up does not create a usable account. It files a request, which the
 * owner approves or turns down. Only on approval does the board come into
 * being, so a turned-down request leaves nothing behind but a row.
 */

/** Ends the request with 403 unless the signed-in user owns this instance. */
function requireOwner(array $user): void
{
    if (($user['role'] ?? '') !== 'owner') {
        fail(403, 'access.owner_only');
    }
}

/** Lists the requests, newest first, without ever exposing a hash. */
function readRequests(PDO $pdo, array $user): void
{
    requireOwner($user);
    $stmt = $pdo->query(
        "SELECT id, name, email, status, created_at, decided_at
         FROM join_users
         WHERE role <> 'guest' AND status <> 'approved'
         ORDER BY created_at DESC
         LIMIT 100"
    );
    respond(200, ['requests' => $stmt->fetchAll()]);
}

/** Approves a request and gives the account the board it was waiting for. */
function approveRequest(PDO $pdo, array $user, string $userId): void
{
    requireOwner($user);
    $pending = findPending($pdo, $userId);
    setStatus($pdo, $userId, 'approved');
    if (!hasBoard($pdo, $userId)) {
        createBoardFor($pdo, $userId, 'My board', false);
    }
    respond(200, ['ok' => true, 'email' => $pending['email']]);
}

/** Turns a request down. The address may try again, nothing more happens. */
function rejectRequest(PDO $pdo, array $user, string $userId): void
{
    requireOwner($user);
    findPending($pdo, $userId);
    setStatus($pdo, $userId, 'rejected');
    respond(200, ['ok' => true]);
}

/**
 * Reads a request that is still open, or ends the call with 404.
 *
 * @return array<string, mixed>
 */
function findPending(PDO $pdo, string $userId): array
{
    $stmt = $pdo->prepare("SELECT id, email FROM join_users WHERE id = ? AND role <> 'guest'");
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    if (!$row) {
        fail(404, 'access.request_not_found');
    }
    return $row;
}

/** Writes the decision and when it was taken. */
function setStatus(PDO $pdo, string $userId, string $status): void
{
    $pdo->prepare('UPDATE join_users SET status = ?, decided_at = NOW() WHERE id = ?')
        ->execute([$status, $userId]);
}

/** Whether an account already has a board. */
function hasBoard(PDO $pdo, string $userId): bool
{
    $stmt = $pdo->prepare('SELECT 1 FROM join_boards WHERE owner_user_id = ? LIMIT 1');
    $stmt->execute([$userId]);
    return (bool) $stmt->fetch();
}

/** How many requests are still waiting, for the badge in the navigation. */
function countPending(PDO $pdo): int
{
    $stmt = $pdo->query("SELECT COUNT(*) FROM join_users WHERE status = 'pending' AND role <> 'guest'");
    return (int) $stmt->fetchColumn();
}

/**
 * Tells the owner that someone asked for access. A mail that cannot be sent
 * must never break the sign-up, so the result is deliberately ignored.
 */
function notifyOwner(PDO $pdo, string $name, string $email): void
{
    $to = ownerEmail($pdo);
    if ($to === '') {
        return;
    }
    $body = "Jemand möchte J0IN nutzen.\n\nName: {$name}\nE-Mail: {$email}\n\n"
        . "Freigeben oder ablehnen unter https://j0in.weskakay.de/settings";
    @mail($to, 'J0IN: neue Zugangsanfrage', $body, buildHeaders($email));
}

/** The address of the owner, or an empty string when there is none. */
function ownerEmail(PDO $pdo): string
{
    $stmt = $pdo->query("SELECT email FROM join_users WHERE role = 'owner' LIMIT 1");
    return (string) ($stmt->fetchColumn() ?: '');
}

/** Headers that keep the mail plain and let a reply go somewhere sensible. */
function buildHeaders(string $replyTo): string
{
    return 'From: J0IN <' . J0IN_MAIL_FROM . ">\r\n"
        . "Reply-To: {$replyTo}\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n";
}
