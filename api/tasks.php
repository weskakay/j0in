<?php

const J0IN_PRIORITIES = ['urgent', 'medium', 'low'];

/** Creates a task with its subtasks and assignees in one transaction. */
function createTask(PDO $pdo, string $boardId, array $body): void
{
    $columnId = bodyString($body, 'columnId');
    requireOwnColumn($pdo, $boardId, $columnId);
    requireValidTask($body);
    $pdo->beginTransaction();
    try {
        $id = insertTaskRow($pdo, $columnId, $body);
        replaceSubtasks($pdo, $id, $body['subtasks'] ?? []);
        replaceAssignees($pdo, $boardId, $id, $body['contactIds'] ?? []);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
    respond(201, ['id' => $id]);
}

/** Title, due date and category are required; priority must be known. */
function requireValidTask(array $body): void
{
    if (bodyString($body, 'title') === '') {
        fail(422, 'A task needs a title');
    }
    if (bodyString($body, 'dueDate') === '') {
        fail(422, 'A task needs a due date');
    }
    $priority = bodyString($body, 'priority');
    if ($priority !== '' && !in_array($priority, J0IN_PRIORITIES, true)) {
        fail(422, 'Unknown priority');
    }
}

/** Writes the task row itself and returns its id. */
function insertTaskRow(PDO $pdo, string $columnId, array $body): string
{
    $id = uuid();
    $stmt = $pdo->prepare(
        'INSERT INTO join_tasks (id, column_id, category_id, title, description, due_date, priority, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM join_tasks t WHERE t.column_id = ?))'
    );
    $stmt->execute([
        $id, $columnId, blankToNull(bodyString($body, 'categoryId')),
        bodyString($body, 'title'), blankToNull(bodyString($body, 'description')),
        bodyString($body, 'dueDate'), bodyString($body, 'priority') ?: 'medium', $columnId,
    ]);
    return $id;
}

/** Turns an empty string into null so optional columns stay null. */
function blankToNull(string $value): ?string
{
    return $value === '' ? null : $value;
}

/** Replaces all subtasks of a task with the given list. */
function replaceSubtasks(PDO $pdo, string $taskId, array $subtasks): void
{
    $pdo->prepare('DELETE FROM join_subtasks WHERE task_id = ?')->execute([$taskId]);
    $stmt = $pdo->prepare(
        'INSERT INTO join_subtasks (id, task_id, title, is_done, position) VALUES (?, ?, ?, ?, ?)'
    );
    foreach (array_values($subtasks) as $index => $sub) {
        $title = is_array($sub) ? trim((string) ($sub['title'] ?? '')) : '';
        if ($title !== '') {
            $stmt->execute([uuid(), $taskId, $title, !empty($sub['isDone']) ? 1 : 0, $index + 1]);
        }
    }
}

/** Replaces the assignees, ignoring contacts from other boards. */
function replaceAssignees(PDO $pdo, string $boardId, string $taskId, array $contactIds): void
{
    $pdo->prepare('DELETE FROM join_task_contacts WHERE task_id = ?')->execute([$taskId]);
    $stmt = $pdo->prepare('INSERT INTO join_task_contacts (task_id, contact_id) VALUES (?, ?)');
    foreach (ownContactIds($pdo, $boardId, $contactIds) as $contactId) {
        $stmt->execute([$taskId, $contactId]);
    }
}

/**
 * Keeps only the ids that really belong to this board.
 *
 * @return list<string>
 */
function ownContactIds(PDO $pdo, string $boardId, array $contactIds): array
{
    $ids = array_values(array_filter($contactIds, 'is_string'));
    if ($ids === []) {
        return [];
    }
    $in = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare("SELECT id FROM join_contacts WHERE board_id = ? AND id IN ($in)");
    $stmt->execute([$boardId, ...$ids]);
    return array_column($stmt->fetchAll(), 'id');
}

/** Updates a task and rewrites its subtasks and assignees. */
function updateTask(PDO $pdo, string $boardId, string $taskId, array $body): void
{
    requireOwnTask($pdo, $boardId, $taskId);
    requireValidTask($body);
    $pdo->beginTransaction();
    try {
        applyTaskFields($pdo, $taskId, $body);
        replaceSubtasks($pdo, $taskId, $body['subtasks'] ?? []);
        replaceAssignees($pdo, $boardId, $taskId, $body['contactIds'] ?? []);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
    respond(200, ['ok' => true]);
}

/** Writes the editable fields of a task. The category stays as it is. */
function applyTaskFields(PDO $pdo, string $taskId, array $body): void
{
    $stmt = $pdo->prepare(
        'UPDATE join_tasks SET title = ?, description = ?, due_date = ?, priority = ? WHERE id = ?'
    );
    $stmt->execute([
        bodyString($body, 'title'), blankToNull(bodyString($body, 'description')),
        bodyString($body, 'dueDate'), bodyString($body, 'priority') ?: 'medium', $taskId,
    ]);
}

/**
 * Moves a task to another column and position. This is its own endpoint
 * because several positions change at once and that belongs in one
 * transaction on the server, not in five separate calls.
 */
function moveTask(PDO $pdo, string $boardId, string $taskId, array $body): void
{
    requireOwnTask($pdo, $boardId, $taskId);
    $columnId = bodyString($body, 'columnId');
    requireOwnColumn($pdo, $boardId, $columnId);
    $position = max(1, (int) ($body['position'] ?? 1));
    $pdo->beginTransaction();
    try {
        shiftPositions($pdo, $columnId, $position);
        $pdo->prepare('UPDATE join_tasks SET column_id = ?, position = ? WHERE id = ?')
            ->execute([$columnId, $position, $taskId]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
    respond(200, ['ok' => true]);
}

/** Makes room at the target position by pushing the others down. */
function shiftPositions(PDO $pdo, string $columnId, int $position): void
{
    $pdo->prepare('UPDATE join_tasks SET position = position + 1 WHERE column_id = ? AND position >= ?')
        ->execute([$columnId, $position]);
}

/** Deletes a task; its subtasks and assignments fall with it. */
function deleteTask(PDO $pdo, string $boardId, string $taskId): void
{
    requireOwnTask($pdo, $boardId, $taskId);
    $pdo->prepare('DELETE FROM join_tasks WHERE id = ?')->execute([$taskId]);
    respond(200, ['ok' => true]);
}

/** Ticks a subtask off or renames it. */
function updateSubtask(PDO $pdo, string $boardId, string $subtaskId, array $body): void
{
    $stmt = $pdo->prepare(
        'SELECT s.id FROM join_subtasks s
         JOIN join_tasks t ON t.id = s.task_id
         JOIN join_columns c ON c.id = t.column_id
         WHERE s.id = ? AND c.board_id = ?'
    );
    $stmt->execute([$subtaskId, $boardId]);
    if (!$stmt->fetch()) {
        fail(404, 'Subtask not found');
    }
    applySubtaskFields($pdo, $subtaskId, $body);
    respond(200, ['ok' => true]);
}

/** Writes the changed subtask fields. */
function applySubtaskFields(PDO $pdo, string $subtaskId, array $body): void
{
    if (isset($body['isDone'])) {
        $pdo->prepare('UPDATE join_subtasks SET is_done = ? WHERE id = ?')
            ->execute([$body['isDone'] ? 1 : 0, $subtaskId]);
    }
    if (bodyString($body, 'title') !== '') {
        $pdo->prepare('UPDATE join_subtasks SET title = ? WHERE id = ?')
            ->execute([bodyString($body, 'title'), $subtaskId]);
    }
}

/** Ends the request with 404 when the task belongs to another board. */
function requireOwnTask(PDO $pdo, string $boardId, string $taskId): void
{
    $stmt = $pdo->prepare(
        'SELECT 1 FROM join_tasks t JOIN join_columns c ON c.id = t.column_id
         WHERE t.id = ? AND c.board_id = ?'
    );
    $stmt->execute([$taskId, $boardId]);
    if (!$stmt->fetch()) {
        fail(404, 'Task not found');
    }
}
