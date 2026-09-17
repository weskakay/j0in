<?php

/** Routes everything that needs a signed-in user and their board. */
function handleBoardArea(PDO $pdo, string $method, array $seg): void
{
    $user = requireUser($pdo);
    $boardId = requireBoardId($pdo, $user['id']);
    dispatchArea($pdo, $boardId, $method, $seg, jsonBody(), $user);
}

/** Picks the handler for the area named by the first path segment. */
function dispatchArea(
    PDO $pdo,
    string $boardId,
    string $method,
    array $seg,
    array $body,
    array $user
): void {
    $id = $seg[1] ?? '';
    match ($seg[0]) {
        'board'      => routeBoard($pdo, $boardId, $method, $id, $body, $user),
        'columns'    => routeColumns($pdo, $boardId, $method, $id, $body, $user),
        'categories' => routeCategories($pdo, $boardId, $method, $id, $body),
        'tasks'      => routeTasks($pdo, $boardId, $method, $id, $seg[2] ?? '', $body, $user),
        'subtasks'   => routeSubtasks($pdo, $boardId, $method, $id, $body),
        'time'       => routeTime($pdo, $boardId, $method, $id, $body),
        'phases'     => routePhases($pdo, $boardId, $method, $id, $body),
        'contacts'   => routeContacts($pdo, $boardId, $method, $id, $body),
        default      => fail(404, 'http.not_found'),
    };
}

/** GET, PUT and the reset of /api/board */
function routeBoard(
    PDO $pdo,
    string $boardId,
    string $method,
    string $id,
    array $body,
    array $user
): void {
    match (true) {
        $method === 'GET' && $id === ''    => readBoard($pdo, $boardId),
        $method === 'PUT' && $id === ''    => renameBoard($pdo, $boardId, $body),
        $method === 'POST' && $id === 'reset' => resetDemoBoard($pdo, $boardId, $user, $body),
        $method === 'POST' && $id === 'language' => switchDemoLanguage($pdo, $boardId, $user, $body),
        $method === 'PUT' && $id === 'time-tracking' => setTimeTracking($pdo, $boardId, $body),
        default => fail(405, 'http.method_not_allowed'),
    };
}

/** POST, PUT and DELETE on /api/columns */
function routeColumns(
    PDO $pdo,
    string $boardId,
    string $method,
    string $id,
    array $body,
    array $user
): void {
    match (true) {
        $method === 'POST' && $id === ''   => createColumn($pdo, $boardId, $body),
        $method === 'PUT' && $id !== ''    => updateColumn($pdo, $boardId, $id, $body),
        $method === 'DELETE' && $id !== '' => deleteColumn($pdo, $boardId, $user, $id, $body),
        default => fail(405, 'http.method_not_allowed'),
    };
}

/** POST, PUT and DELETE on /api/categories */
function routeCategories(PDO $pdo, string $boardId, string $method, string $id, array $body): void
{
    match (true) {
        $method === 'POST' && $id === ''   => createCategory($pdo, $boardId, $body),
        $method === 'PUT' && $id !== ''    => updateCategory($pdo, $boardId, $id, $body),
        $method === 'DELETE' && $id !== '' => deleteCategory($pdo, $boardId, $id, $body),
        default => fail(405, 'http.method_not_allowed'),
    };
}

/** POST, PUT, PUT .../move and DELETE on /api/tasks */
function routeTasks(
    PDO $pdo,
    string $boardId,
    string $method,
    string $id,
    string $sub,
    array $body,
    array $user
): void {
    match (true) {
        $method === 'POST' && $id === ''             => createTask($pdo, $boardId, $body),
        $method === 'POST' && $sub === 'schedule'    => scheduleTask($pdo, $boardId, $user, $id, $body),
        $method === 'DELETE' && $sub === 'schedule'  => unscheduleTask($pdo, $boardId, $user, $id),
        $method === 'POST' && $sub === 'timer'       => startTimer($pdo, $boardId, $id, $body),
        $method === 'DELETE' && $sub === 'timer'     => stopTimer($pdo, $boardId, $id),
        $method === 'POST' && $sub === 'time'        => addTime($pdo, $boardId, $id, $body),
        $method === 'PUT' && $sub === 'move'         => moveTask($pdo, $boardId, $id, $body),
        $method === 'PUT' && $id !== '' && $sub === '' => updateTask($pdo, $boardId, $id, $body),
        $method === 'DELETE' && $id !== ''           => deleteTask($pdo, $boardId, $user, $id),
        default => fail(405, 'http.method_not_allowed'),
    };
}

/** PUT on /api/subtasks */
function routeSubtasks(PDO $pdo, string $boardId, string $method, string $id, array $body): void
{
    $method === 'PUT' && $id !== ''
        ? updateSubtask($pdo, $boardId, $id, $body)
        : fail(405, 'http.method_not_allowed');
}

/** PUT and DELETE on /api/time, one booked entry */
function routeTime(PDO $pdo, string $boardId, string $method, string $id, array $body): void
{
    match (true) {
        $method === 'PUT' && $id !== ''    => updateTime($pdo, $boardId, $id, $body),
        $method === 'DELETE' && $id !== '' => deleteTime($pdo, $boardId, $id),
        default => fail(405, 'http.method_not_allowed'),
    };
}

/** POST, PUT and DELETE on /api/phases */
function routePhases(PDO $pdo, string $boardId, string $method, string $id, array $body): void
{
    match (true) {
        $method === 'POST' && $id === ''   => createPhase($pdo, $boardId, $body),
        $method === 'PUT' && $id !== ''    => renamePhase($pdo, $boardId, $id, $body),
        $method === 'DELETE' && $id !== '' => deletePhase($pdo, $boardId, $id),
        default => fail(405, 'http.method_not_allowed'),
    };
}

/** POST, PUT and DELETE on /api/contacts */
function routeContacts(PDO $pdo, string $boardId, string $method, string $id, array $body): void
{
    match (true) {
        $method === 'POST' && $id === ''   => createContact($pdo, $boardId, $body),
        $method === 'PUT' && $id !== ''    => updateContact($pdo, $boardId, $id, $body),
        $method === 'DELETE' && $id !== '' => deleteContact($pdo, $boardId, $id),
        default => fail(405, 'http.method_not_allowed'),
    };
}
