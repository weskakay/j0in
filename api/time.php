<?php

// What a fresh board books its time on, in both languages the app speaks.
const J0IN_START_PHASES = [
    'de' => ['Planen', 'Umsetzen', 'Testen', 'Recherche'],
    'en' => ['Planning', 'Building', 'Testing', 'Research'],
];

/** The longest entry that can be typed in by hand: one full day. */
const J0IN_MAX_MINUTES = 1440;

/** The focus lengths a timer can be started with, in minutes. */
const J0IN_FOCUS_LENGTHS = [15, 25, 50];

/**
 * What stopping writes: the end and the seconds, both held to the target of
 * a focus run, so stopping late never books more than was planned.
 */
const J0IN_STOP_FIELDS = 'e.ended_at = LEAST(NOW(), COALESCE(e.started_at + INTERVAL e.target_minutes MINUTE, NOW())),
    e.seconds = LEAST(TIMESTAMPDIFF(SECOND, e.started_at, NOW()),
                      COALESCE(e.target_minutes * 60, TIMESTAMPDIFF(SECOND, e.started_at, NOW())))';

/** Writes the starting phases of a board in the given language. */
function insertStartPhases(PDO $pdo, string $boardId, string $lang = 'de'): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO join_time_phases (id, board_id, name, position) VALUES (?, ?, ?, ?)'
    );
    foreach (startPhasesIn($lang) as $index => $name) {
        $stmt->execute([uuid(), $boardId, $name, $index + 1]);
    }
}

/**
 * The starting phase names in one language, German when it is unknown.
 *
 * @return list<string>
 */
function startPhasesIn(string $lang): array
{
    return J0IN_START_PHASES[$lang] ?? J0IN_START_PHASES['de'];
}

/**
 * Puts the starting phases into another language. A phase somebody renamed
 * no longer carries either default name and is left as it was typed.
 */
function translateStartPhases(PDO $pdo, string $boardId, string $lang): void
{
    $stmt = $pdo->prepare(
        'UPDATE join_time_phases SET name = ? WHERE board_id = ? AND position = ? AND name IN (?, ?)'
    );
    foreach (startPhasesIn($lang) as $index => $name) {
        $defaults = [J0IN_START_PHASES['de'][$index], J0IN_START_PHASES['en'][$index]];
        $stmt->execute([$name, $boardId, $index + 1, ...$defaults]);
    }
}

/** @return list<array<string, mixed>> */
function readPhases(PDO $pdo, string $boardId): array
{
    $stmt = $pdo->prepare(
        'SELECT id, name, position FROM join_time_phases WHERE board_id = ? ORDER BY position'
    );
    $stmt->execute([$boardId]);
    return array_map(fn($r) => [
        'id' => $r['id'], 'name' => $r['name'], 'position' => (int) $r['position'],
    ], $stmt->fetchAll());
}

/**
 * The phase ids of a board in their order, so the demo can refer to them by
 * position.
 *
 * @return list<string>
 */
function phaseIdsInOrder(PDO $pdo, string $boardId): array
{
    return array_column(readPhases($pdo, $boardId), 'id');
}

/** Adds a phase at the end of the list. */
function createPhase(PDO $pdo, string $boardId, array $body): void
{
    $name = requirePhaseName($body);
    $id = uuid();
    $stmt = $pdo->prepare(
        'INSERT INTO join_time_phases (id, board_id, name, position)
         VALUES (?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM join_time_phases p WHERE p.board_id = ?))'
    );
    $stmt->execute([$id, $boardId, $name, $boardId]);
    respond(201, ['id' => $id]);
}

/** Gives a phase another name. */
function renamePhase(PDO $pdo, string $boardId, string $phaseId, array $body): void
{
    requireOwnPhase($pdo, $boardId, $phaseId);
    $name = requirePhaseName($body);
    $pdo->prepare('UPDATE join_time_phases SET name = ? WHERE id = ?')->execute([$name, $phaseId]);
    respond(200, ['ok' => true]);
}

/** Deletes a phase. The time booked on it stays, just without a phase. */
function deletePhase(PDO $pdo, string $boardId, string $phaseId): void
{
    requireOwnPhase($pdo, $boardId, $phaseId);
    $pdo->prepare('DELETE FROM join_time_phases WHERE id = ?')->execute([$phaseId]);
    respond(200, ['ok' => true]);
}

/** The trimmed phase name, or the request ends with 422. */
function requirePhaseName(array $body): string
{
    $name = bodyString($body, 'name');
    if ($name === '' || mb_strlen($name) > 60) {
        fail(422, 'phase.name_required');
    }
    return $name;
}

/** Ends the request with 404 when the phase belongs to another board. */
function requireOwnPhase(PDO $pdo, string $boardId, string $phaseId): void
{
    $stmt = $pdo->prepare('SELECT 1 FROM join_time_phases WHERE id = ? AND board_id = ?');
    $stmt->execute([$phaseId, $boardId]);
    if (!$stmt->fetch()) {
        fail(404, 'phase.not_found');
    }
}

/** The phase named in the body if it belongs to this board, null for none. */
function ownPhaseOrNull(PDO $pdo, string $boardId, array $body): ?string
{
    $phaseId = bodyString($body, 'phaseId');
    if ($phaseId === '') {
        return null;
    }
    requireOwnPhase($pdo, $boardId, $phaseId);
    return $phaseId;
}

/**
 * Time entries grouped by task id, in the order they were finished and the
 * running one last. A running entry reports its seconds so far by the
 * database clock, so a device with a wrong clock cannot distort it.
 *
 * @return array<string, list<array<string, mixed>>>
 */
function timeByTask(PDO $pdo, array $taskIds): array
{
    if ($taskIds === []) {
        return [];
    }
    $in = implode(',', array_fill(0, count($taskIds), '?'));
    $stmt = $pdo->prepare(
        "SELECT id, task_id, phase_id, note, started_at, target_minutes, ended_at IS NULL AS running,
                IF(ended_at IS NULL, TIMESTAMPDIFF(SECOND, started_at, NOW()), seconds) AS seconds
         FROM join_time_entries WHERE task_id IN ($in)
         ORDER BY ended_at IS NULL, ended_at, started_at"
    );
    $stmt->execute($taskIds);
    return groupTimeEntries($stmt->fetchAll());
}

/** @return array<string, list<array<string, mixed>>> */
function groupTimeEntries(array $rows): array
{
    $grouped = [];
    foreach ($rows as $row) {
        $grouped[$row['task_id']][] = [
            'id'        => $row['id'],
            'phaseId'   => $row['phase_id'],
            'note'      => $row['note'],
            'startedAt' => $row['started_at'],
            'running'   => (bool) $row['running'],
            'target'    => $row['target_minutes'] === null ? null : (int) $row['target_minutes'],
            'seconds'   => max(0, (int) $row['seconds']),
        ];
    }
    return $grouped;
}

/**
 * Starts the timer on a card. Only one runs per board, so whatever was running
 * elsewhere stops first, in the same transaction.
 */
function startTimer(PDO $pdo, string $boardId, string $taskId, array $body): void
{
    requireTimeTracking($pdo, $boardId);
    requireOwnTask($pdo, $boardId, $taskId);
    $phaseId = ownPhaseOrNull($pdo, $boardId, $body);
    $target = focusTarget($body);
    $id = inTransaction($pdo, function () use ($pdo, $boardId, $taskId, $phaseId, $target) {
        stopRunningOn($pdo, $boardId);
        $id = insertTimeRow($pdo, $taskId, $phaseId, 0, null);
        $pdo->prepare('UPDATE join_time_entries SET target_minutes = ? WHERE id = ?')->execute([$target, $id]);
        return $id;
    });
    respond(201, ['id' => $id]);
}

/** The focus length asked for, or null for a timer that runs open-ended. */
function focusTarget(array $body): ?int
{
    $target = $body['targetMinutes'] ?? null;
    if ($target === null) {
        return null;
    }
    if (!in_array($target, J0IN_FOCUS_LENGTHS, true)) {
        fail(422, 'time.bad_target');
    }
    return $target;
}

/**
 * Ends focus runs whose time is up while nobody was looking, for instance
 * with the tab closed. They end exactly on their target, not when the board
 * happens to be read again.
 */
function closeFinishedFocus(PDO $pdo, string $boardId): void
{
    $pdo->prepare(
        'UPDATE join_time_entries e
         JOIN join_tasks t ON t.id = e.task_id
         JOIN join_columns c ON c.id = t.column_id
         SET e.ended_at = e.started_at + INTERVAL e.target_minutes MINUTE, e.seconds = e.target_minutes * 60
         WHERE c.board_id = ? AND e.ended_at IS NULL AND e.target_minutes IS NOT NULL
           AND e.started_at + INTERVAL e.target_minutes MINUTE <= NOW()'
    )->execute([$boardId]);
}

/** Stops the timer of a card, if one runs there. */
function stopTimer(PDO $pdo, string $boardId, string $taskId): void
{
    requireOwnTask($pdo, $boardId, $taskId);
    inTransaction($pdo, fn() => stopRunning($pdo, 'e.task_id = ?', [$taskId]));
    respond(200, ['ok' => true]);
}

/** Stops every running timer of a board. */
function stopRunningOn(PDO $pdo, string $boardId): void
{
    stopRunning($pdo, 'c.board_id = ?', [$boardId]);
}

/**
 * Stops the running entries matching the condition. A run shorter than a
 * minute is a tap by mistake more often than work, so it is dropped instead
 * of cluttering the card with an entry of zero minutes.
 */
function stopRunning(PDO $pdo, string $where, array $params): void
{
    $scope = 'join_time_entries e
         JOIN join_tasks t ON t.id = e.task_id
         JOIN join_columns c ON c.id = t.column_id';
    $pdo->prepare(
        "DELETE e FROM {$scope}
         WHERE {$where} AND e.ended_at IS NULL AND TIMESTAMPDIFF(SECOND, e.started_at, NOW()) < 60"
    )->execute($params);
    $pdo->prepare("UPDATE {$scope} SET " . J0IN_STOP_FIELDS . " WHERE {$where} AND e.ended_at IS NULL")
        ->execute($params);
}

/**
 * Writes one entry. With minutes it is finished and lies just behind now,
 * without any it starts now and keeps running.
 */
function insertTimeRow(PDO $pdo, string $taskId, ?string $phaseId, int $minutes, ?string $note): string
{
    $id = uuid();
    $stmt = $pdo->prepare(
        'INSERT INTO join_time_entries (id, task_id, phase_id, started_at, ended_at, seconds, note)
         VALUES (?, ?, ?, NOW() - INTERVAL ? MINUTE, IF(? = 0, NULL, NOW()), ?, ?)'
    );
    $stmt->execute([$id, $taskId, $phaseId, $minutes, $minutes, $minutes * 60, $note]);
    return $id;
}

/** Books time on a card by hand, for work the timer did not see. */
function addTime(PDO $pdo, string $boardId, string $taskId, array $body): void
{
    requireTimeTracking($pdo, $boardId);
    requireOwnTask($pdo, $boardId, $taskId);
    $phaseId = ownPhaseOrNull($pdo, $boardId, $body);
    $minutes = requireMinutes($body);
    $id = insertTimeRow($pdo, $taskId, $phaseId, $minutes, timeNote($body));
    respond(201, ['id' => $id]);
}

/**
 * Changes an entry. A running one keeps its clock: only phase and note move,
 * and the duration is written when it stops.
 */
function updateTime(PDO $pdo, string $boardId, string $entryId, array $body): void
{
    $running = requireOwnEntry($pdo, $boardId, $entryId);
    $phaseId = ownPhaseOrNull($pdo, $boardId, $body);
    $note = timeNote($body);
    $seconds = $running ? null : requireMinutes($body) * 60;
    $pdo->prepare(
        'UPDATE join_time_entries SET phase_id = ?, note = ?, seconds = COALESCE(?, seconds) WHERE id = ?'
    )->execute([$phaseId, $note, $seconds, $entryId]);
    respond(200, ['ok' => true]);
}

/** Deletes one entry. */
function deleteTime(PDO $pdo, string $boardId, string $entryId): void
{
    requireOwnEntry($pdo, $boardId, $entryId);
    $pdo->prepare('DELETE FROM join_time_entries WHERE id = ?')->execute([$entryId]);
    respond(200, ['ok' => true]);
}

/** Whole minutes between one and a full day, or the request ends with 422. */
function requireMinutes(array $body): int
{
    $minutes = $body['minutes'] ?? null;
    if (!is_int($minutes) || $minutes < 1 || $minutes > J0IN_MAX_MINUTES) {
        fail(422, 'time.minutes_invalid');
    }
    return $minutes;
}

/** The optional note, null when empty; a note that is too long ends the request. */
function timeNote(array $body): ?string
{
    $note = bodyString($body, 'note');
    if (mb_strlen($note) > 200) {
        fail(422, 'time.note_too_long');
    }
    return blankToNull($note);
}

/**
 * Ends the request with 404 unless the entry sits on this board, and tells
 * whether its timer is still running.
 */
function requireOwnEntry(PDO $pdo, string $boardId, string $entryId): bool
{
    $stmt = $pdo->prepare(
        'SELECT e.ended_at IS NULL AS running FROM join_time_entries e
         JOIN join_tasks t ON t.id = e.task_id
         JOIN join_columns c ON c.id = t.column_id
         WHERE e.id = ? AND c.board_id = ?'
    );
    $stmt->execute([$entryId, $boardId]);
    $row = $stmt->fetch();
    if (!$row) {
        fail(404, 'time.not_found');
    }
    return (bool) $row['running'];
}
