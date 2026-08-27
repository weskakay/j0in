<?php

const J0IN_MAX_ATTEMPTS = 5;

/**
 * Ends the request with 429 while the caller is blocked.
 * Without this brake a script could try thousands of passwords a minute.
 */
function requireNotBlocked(PDO $pdo, string $ip): void
{
    $stmt = $pdo->prepare('SELECT attempts, blocked_until FROM join_login_attempts WHERE ip = ?');
    $stmt->execute([$ip]);
    $row = $stmt->fetch();
    if ($row && $row['blocked_until'] !== null && strtotime($row['blocked_until']) > time()) {
        fail(429, 'Too many attempts, please wait a moment');
    }
}

/**
 * Counts a failed attempt and blocks the caller once the limit is reached.
 * The pause grows with every further block: 1 minute, then 5, then 25.
 */
function countFailure(PDO $pdo, string $ip): void
{
    $attempts = nextAttemptCount($pdo, $ip);
    $blockedUntil = null;
    if ($attempts >= J0IN_MAX_ATTEMPTS) {
        $minutes = blockMinutes($attempts);
        $blockedUntil = (new DateTimeImmutable("+{$minutes} minutes"))->format('Y-m-d H:i:s');
    }
    $stmt = $pdo->prepare(
        'INSERT INTO join_login_attempts (ip, attempts, blocked_until) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE attempts = VALUES(attempts), blocked_until = VALUES(blocked_until)'
    );
    $stmt->execute([$ip, $attempts, $blockedUntil]);
}

/** Reads the current counter and adds one. */
function nextAttemptCount(PDO $pdo, string $ip): int
{
    $stmt = $pdo->prepare('SELECT attempts FROM join_login_attempts WHERE ip = ?');
    $stmt->execute([$ip]);
    $row = $stmt->fetch();
    return (int) ($row['attempts'] ?? 0) + 1;
}

/** How long to block: 1 minute for the first block, then five times longer. */
function blockMinutes(int $attempts): int
{
    $blocks = intdiv($attempts, J0IN_MAX_ATTEMPTS);
    return (int) min(25, 5 ** max(0, $blocks - 1));
}

/** Clears the counter after a successful sign-in. */
function clearFailures(PDO $pdo, string $ip): void
{
    $stmt = $pdo->prepare('DELETE FROM join_login_attempts WHERE ip = ?');
    $stmt->execute([$ip]);
}
