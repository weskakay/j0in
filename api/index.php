<?php

// Warnings must never be printed: they would land in front of the JSON and
// make the response unparseable. They go to the log instead.
ini_set('display_errors', '0');
ini_set('log_errors', '1');

require __DIR__ . '/settings.php';
require __DIR__ . '/http.php';
require __DIR__ . '/db.php';
require __DIR__ . '/crypto.php';
require __DIR__ . '/session.php';
require __DIR__ . '/ratelimit.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/board.php';
require __DIR__ . '/columns.php';
require __DIR__ . '/tasks.php';
require __DIR__ . '/time.php';
require __DIR__ . '/contacts.php';
require __DIR__ . '/access.php';
require __DIR__ . '/calendar.php';
require __DIR__ . '/events.php';
require __DIR__ . '/planning.php';
require __DIR__ . '/demo-cards.php';
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
        $method === 'POST' && $action === 'guest'  => signInAsGuest($pdo, $body),
        $method === 'POST' && $action === 'logout' => logoutAndRespond($pdo),
        $method === 'GET'  && $action === 'me'     => respondWithUser($pdo),
        default => fail(405, 'http.method_not_allowed'),
    };
}

/** Answers with the signed-in user, or an empty object when there is none. */
function respondWithUser(PDO $pdo): void
{
    $user = currentUser($pdo);
    respond(200, $user === null ? [] : publicUser($user));
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
    respond(200, [
        'ok' => true,
        'php' => PHP_VERSION,
        'database' => databaseState(),
        'curl' => extension_loaded('curl') ? 'ok' : 'missing',
        'outbound' => reachesGoogle() ? 'ok' : 'blocked',
        'sealing' => sealingReady() ? 'ok' : 'missing',
        'calendar' => calendarReady() ? 'ready' : 'off',
    ]);
}

/** Whether the database answers at all. */
function databaseState(): string
{
    try {
        db()->query('SELECT 1');
        return 'ok';
    } catch (Throwable $e) {
        return 'unreachable';
    }
}

/**
 * Whether this server may open a connection of its own to the outside. Some
 * shared hosts do not allow it, and the calendar link stands or falls with it.
 */
function reachesGoogle(): bool
{
    if (!extension_loaded('curl')) {
        return false;
    }
    $curl = curl_init('https://oauth2.googleapis.com/');
    curl_setopt_array($curl, [CURLOPT_NOBODY => true, CURLOPT_TIMEOUT => 5, CURLOPT_RETURNTRANSFER => true]);
    curl_exec($curl);
    $failed = curl_errno($curl) !== 0;
    curl_close($curl);
    return !$failed;
}

/** Routes everything under /api/access, which only the owner may reach. */
function handleAccess(PDO $pdo, string $method, array $seg): void
{
    $user = requireUser($pdo);
    $id = $seg[1] ?? '';
    $action = $seg[2] ?? '';
    match (true) {
        $method === 'GET' && $id === ''             => readRequests($pdo, $user),
        $method === 'POST' && $action === 'approve' => approveRequest($pdo, $user, $id),
        $method === 'POST' && $action === 'reject'  => rejectRequest($pdo, $user, $id),
        default => fail(405, 'http.method_not_allowed'),
    };
}

/** Routes everything under /api/calendar for the signed-in user. */
function handleCalendar(PDO $pdo, string $method, array $seg): void
{
    $user = requireUser($pdo);
    requireCalendarUser($user);
    $action = $seg[1] ?? '';
    match (true) {
        $method === 'GET' && $action === ''           => calendarStatus($pdo, $user),
        $method === 'GET' && $action === 'events'     => readDay($pdo, $user),
        $method === 'GET' && $action === 'connect'    => startCalendarConnect($user),
        $method === 'GET' && $action === 'callback'   => finishCalendarConnect($pdo, $user),
        $method === 'DELETE' && $action === ''        => disconnectCalendar($pdo, $user),
        default => fail(405, 'http.method_not_allowed'),
    };
}

/** The areas that need a signed-in user and their board. */
const J0IN_BOARD_AREAS = ['board', 'columns', 'categories', 'tasks', 'subtasks', 'time', 'phases', 'contacts'];

/** Entry point: picks the area from the first path segment. */
function handle(string $method, array $seg): void
{
    $area = $seg[0] ?? '';
    match (true) {
        $area === 'health' => handleHealth(),
        $area === 'auth'   => handleAuth(db(), $method, $seg[1] ?? ''),
        $area === 'access' => handleAccess(db(), $method, $seg),
        $area === 'calendar' => handleCalendar(db(), $method, $seg),
        in_array($area, J0IN_BOARD_AREAS, true) => handleBoardArea(db(), $method, $seg),
        default => fail(404, 'http.not_found'),
    };
}

try {
    handle($_SERVER['REQUEST_METHOD'] ?? 'GET', segments());
} catch (Throwable $e) {
    error_log('j0in: ' . $e->getMessage());
    fail(500, 'server.error');
}
