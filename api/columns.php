<?php

/** Adds a column at the end of the board. */
function createColumn(PDO $pdo, string $boardId, array $body): void
{
    $name = bodyString($body, 'name');
    if ($name === '') {
        fail(422, 'column.name_required');
    }
    $id = uuid();
    $stmt = $pdo->prepare(
        'INSERT INTO join_columns (id, board_id, name, position)
         VALUES (?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM join_columns c WHERE c.board_id = ?))'
    );
    $stmt->execute([$id, $boardId, $name, $boardId]);
    syncBoardDone($pdo, $boardId);
    respond(201, ['id' => $id, 'name' => $name]);
}

/** Renames a column or moves it to another position. */
function updateColumn(PDO $pdo, string $boardId, string $columnId, array $body): void
{
    requireOwnColumn($pdo, $boardId, $columnId);
    $fields = [];
    $values = [];
    collectColumnChanges($body, $fields, $values);
    if ($fields === []) {
        fail(422, 'column.nothing_to_change');
    }
    $values[] = $columnId;
    $pdo->prepare('UPDATE join_columns SET ' . implode(', ', $fields) . ' WHERE id = ?')
        ->execute($values);
    syncBoardDone($pdo, $boardId);
    respond(200, ['ok' => true]);
}

/** Picks the fields the caller actually wants to change. */
function collectColumnChanges(array $body, array &$fields, array &$values): void
{
    if (bodyString($body, 'name') !== '') {
        $fields[] = 'name = ?';
        $values[] = bodyString($body, 'name');
    }
    if (isset($body['position'])) {
        $fields[] = 'position = ?';
        $values[] = (int) $body['position'];
    }
}

/**
 * Deletes a column. The caller must say what happens to its tasks, either
 * a target column or an explicit delete, so no task is ever left orphaned.
 */
function deleteColumn(PDO $pdo, string $boardId, array $user, string $columnId, array $body): void
{
    requireOwnColumn($pdo, $boardId, $columnId);
    $count = countTasksIn($pdo, $columnId);
    if ($count > 0) {
        $doomed = taskIdsIn($pdo, $columnId);
        applyTaskDisposal($pdo, $boardId, $columnId, $body, $count);
        dropEventsOf($pdo, $user, stillIn($pdo, $columnId, $doomed));
    }
    $pdo->prepare('DELETE FROM join_columns WHERE id = ?')->execute([$columnId]);
    syncBoardDone($pdo, $boardId);
    respond(200, ['ok' => true]);
}

/**
 * Of the given cards, the ones still sitting in this column. Cards moved
 * elsewhere keep their appointment; only those going down with the column
 * lose it.
 *
 * @param list<string> $taskIds
 * @return list<string>
 */
function stillIn(PDO $pdo, string $columnId, array $taskIds): array
{
    $left = taskIdsIn($pdo, $columnId);
    return array_values(array_intersect($taskIds, $left));
}

/** Moves the tasks away, or refuses when the caller did not decide. */
function applyTaskDisposal(PDO $pdo, string $boardId, string $columnId, array $body, int $count): void
{
    $target = bodyString($body, 'moveTo');
    if ($target !== '') {
        requireOwnColumn($pdo, $boardId, $target);
        $pdo->prepare('UPDATE join_tasks SET column_id = ? WHERE column_id = ?')
            ->execute([$target, $columnId]);
        return;
    }
    if (($body['deleteTasks'] ?? false) !== true) {
        fail(409, 'column.has_tasks', ['count' => $count]);
    }
}

/** How many tasks sit in a column. */
function countTasksIn(PDO $pdo, string $columnId): int
{
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM join_tasks WHERE column_id = ?');
    $stmt->execute([$columnId]);
    return (int) $stmt->fetchColumn();
}

/** Ends the request with 404 when the column belongs to another board. */
function requireOwnColumn(PDO $pdo, string $boardId, string $columnId): void
{
    $stmt = $pdo->prepare('SELECT 1 FROM join_columns WHERE id = ? AND board_id = ?');
    $stmt->execute([$columnId, $boardId]);
    if (!$stmt->fetch()) {
        fail(404, 'column.not_found');
    }
}
