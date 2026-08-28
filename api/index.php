<?php

// Warnings must never be printed: they would land in front of the JSON and
// make the response unparseable. They go to the log instead.
ini_set('display_errors', '0');
ini_set('log_errors', '1');

require __DIR__ . '/settings.php';
require __DIR__ . '/http.php';
require __DIR__ . '/db.php';
require __DIR__ . '/session.php';
require __DIR__ . '/ratelimit.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/board.php';
require __DIR__ . '/columns.php';
require __DIR__ . '/tasks.php';
require __DIR__ . '/contacts.php';
require __DIR__ . '/demo.php';
require __DIR__ . '/routes.php';

/** Turns an uncaught fatal error into a JSON 500 instead of an empty response. */
register_shutdown_function(function (): void {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_COMPILE_ERROR], true)) {
        http_response_code(500);
        echo json_encode(['error' => 'Server error']);
    }
});

/** Routes a request under /api/auth to its handler. */
function handleAuth(PDO $pdo, string $method, string $action): void
{
    $body = jsonBody();
    match (true) {
        $method === 'POST' && $action === 'signup' => signUp($pdo, $body),
        $method === 'POST' && $action === 'login'  => signIn($pdo, $body),
        $method === 'POST' && $action === 'guest'  => signInAsGuest($pdo),
        $method === 'POST' && $action === 'logout' => logoutAndRespond($pdo),
        $method === 'GET'  && $action === 'me'     => respond(200, currentUser($pdo) ?? []),
        default => fail(405, 'Method not allowed'),
    };
}

/** Ends the session and confirms it. */
function logoutAndRespond(PDO $pdo): void
{
    endSession($pdo);
    respond(200, ['ok' => true]);
}

/**
 * Answers /api/health without touching the database, so a failing answer
 * here means PHP itself is broken rather than the connection.
 */
function handleHealth(): void
{
    $db = 'unchecked';
    try {
        db()->query('SELECT 1');
        $db = 'ok';
    } catch (Throwable $e) {
        $db = 'unreachable';
    }
    respond(200, ['ok' => true, 'php' => PHP_VERSION, 'database' => $db]);
}

/** Entry point: picks the area from the first path segment. */
function handle(string $method, array $seg): void
{
    $area = $seg[0] ?? '';
    if ($area === 'health') {
        handleHealth();
    }
    if ($area === 'auth') {
        handleAuth(db(), $method, $seg[1] ?? '');
    }
    if (in_array($area, ['board', 'columns', 'categories', 'tasks', 'subtasks', 'contacts'], true)) {
        handleBoardArea(db(), $method, $seg);
    }
    fail(404, 'Not found');
}

try {
    handle($_SERVER['REQUEST_METHOD'] ?? 'GET', segments());
} catch (Throwable $e) {
    error_log('j0in: ' . $e->getMessage());
    fail(500, 'Server error');
}
