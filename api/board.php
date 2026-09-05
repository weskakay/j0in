<?php

/**
 * Reads the whole board in one request: columns, categories, tasks with their
 * subtasks and assignees, plus contacts. The board screen shows all of it at
 * once, so four separate calls would only mean four waits.
 */
function readBoard(PDO $pdo, string $boardId): void
{
    respond(200, [
        'name'       => boardName($pdo, $boardId),
        'columns'    => readColumns($pdo, $boardId),
        'categories' => readCategories($pdo, $boardId),
        'tasks'      => readTasks($pdo, $boardId),
        'contacts'   => readContacts($pdo, $boardId),
    ]);
}

/** The name the board carries. */
function boardName(PDO $pdo, string $boardId): string
{
    $stmt = $pdo->prepare('SELECT name FROM join_boards WHERE id = ?');
    $stmt->execute([$boardId]);
    return (string) $stmt->fetchColumn();
}

/** Gives the board another name. */
function renameBoard(PDO $pdo, string $boardId, array $body): void
{
    $name = bodyString($body, 'name');
    if ($name === '') {
        fail(422, 'board.name_required');
    }
    $pdo->prepare('UPDATE join_boards SET name = ? WHERE id = ?')->execute([$name, $boardId]);
    respond(200, ['ok' => true]);
}

/**
 * Puts the demo board back on request. Only the shared guest may do this: on
 * a real board it would be a way to lose everything by mis-click.
 */
function resetDemoBoard(PDO $pdo, string $boardId, array $user, array $body = []): void
{
    if (($user['role'] ?? '') !== 'guest') {
        fail(403, 'board.demo_only');
    }
    dropEventsOf($pdo, $user, allTaskIdsOf($pdo, $boardId));
    rebuildDemoBoard($pdo, $boardId, bodyString($body, 'lang'));
    respond(200, ['ok' => true]);
}

/**
 * Puts the seeded cards and the board's own name into another language. Only
 * the shared guest has anything to switch: a real board holds no demo text.
 */
function switchDemoLanguage(PDO $pdo, string $boardId, array $user, array $body = []): void
{
    if (($user['role'] ?? '') !== 'guest') {
        fail(403, 'board.demo_only');
    }
    $lang = bodyString($body, 'lang');
    $pdo->prepare('UPDATE join_boards SET name = ? WHERE id = ?')
        ->execute([boardNameIn($lang), $boardId]);
    rewriteDemoText($pdo, $boardId, $lang);
    respond(200, ['ok' => true]);
}

/** Removes every card and contact of a board, leaving its columns alone. */
function clearBoard(PDO $pdo, string $boardId): void
{
    $pdo->prepare(
        'DELETE t FROM join_tasks t JOIN join_columns c ON c.id = t.column_id WHERE c.board_id = ?'
    )->execute([$boardId]);
    $pdo->prepare('DELETE FROM join_contacts WHERE board_id = ?')->execute([$boardId]);
}

/** @return list<array<string, mixed>> */
function readColumns(PDO $pdo, string $boardId): array
{
    $stmt = $pdo->prepare(
        'SELECT id, name, position FROM join_columns WHERE board_id = ? ORDER BY position'
    );
    $stmt->execute([$boardId]);
    return array_map(fn($r) => [
        'id' => $r['id'], 'name' => $r['name'], 'position' => (int) $r['position'],
    ], $stmt->fetchAll());
}

/** @return list<array<string, mixed>> */
function readCategories(PDO $pdo, string $boardId): array
{
    $stmt = $pdo->prepare(
        'SELECT id, name, color, position FROM join_categories WHERE board_id = ? ORDER BY position'
    );
    $stmt->execute([$boardId]);
    return array_map(fn($r) => [
        'id' => $r['id'], 'name' => $r['name'],
        'color' => $r['color'], 'position' => (int) $r['position'],
    ], $stmt->fetchAll());
}

/** @return list<array<string, mixed>> */
function readContacts(PDO $pdo, string $boardId): array
{
    $stmt = $pdo->prepare(
        'SELECT id, name, email, phone, color FROM join_contacts WHERE board_id = ? ORDER BY name'
    );
    $stmt->execute([$boardId]);
    return $stmt->fetchAll();
}

/**
 * All tasks of the board with their subtasks and assignee ids attached.
 *
 * @return list<array<string, mixed>>
 */
function readTasks(PDO $pdo, string $boardId): array
{
    $stmt = $pdo->prepare(
        'SELECT t.id, t.column_id, t.category_id, t.title, t.description,
                t.due_date, t.priority, t.position
         FROM join_tasks t
         JOIN join_columns c ON c.id = t.column_id
         WHERE c.board_id = ? ORDER BY t.position'
    );
    $stmt->execute([$boardId]);
    $rows = $stmt->fetchAll();
    $ids = array_column($rows, 'id');
    return attachDetails($pdo, $rows, subtasksByTask($pdo, $ids), contactsByTask($pdo, $ids));
}

/**
 * Merges subtasks and assignees into the task rows and renames the columns
 * to the camelCase the frontend expects.
 *
 * @return list<array<string, mixed>>
 */
function attachDetails(PDO $pdo, array $rows, array $subtasks, array $contacts): array
{
    return array_map(fn($r) => [
        'id'          => $r['id'],
        'columnId'    => $r['column_id'],
        'categoryId'  => $r['category_id'],
        'title'       => $r['title'],
        'description' => $r['description'],
        'dueDate'     => $r['due_date'],
        'priority'    => $r['priority'],
        'position'    => (int) $r['position'],
        'subtasks'    => $subtasks[$r['id']] ?? [],
        'contactIds'  => $contacts[$r['id']] ?? [],
    ], $rows);
}

/**
 * Subtasks grouped by task id, fetched in one query instead of one per task.
 *
 * @return array<string, list<array<string, mixed>>>
 */
function subtasksByTask(PDO $pdo, array $taskIds): array
{
    if ($taskIds === []) {
        return [];
    }
    $in = implode(',', array_fill(0, count($taskIds), '?'));
    $stmt = $pdo->prepare(
        "SELECT id, task_id, title, is_done, position FROM join_subtasks
         WHERE task_id IN ($in) ORDER BY position"
    );
    $stmt->execute($taskIds);
    return groupSubtasks($stmt->fetchAll());
}

/** @return array<string, list<array<string, mixed>>> */
function groupSubtasks(array $rows): array
{
    $grouped = [];
    foreach ($rows as $row) {
        $grouped[$row['task_id']][] = [
            'id'       => $row['id'],
            'title'    => $row['title'],
            'isDone'   => (bool) $row['is_done'],
            'position' => (int) $row['position'],
        ];
    }
    return $grouped;
}

/**
 * Assigned contact ids grouped by task id.
 *
 * @return array<string, list<string>>
 */
function contactsByTask(PDO $pdo, array $taskIds): array
{
    if ($taskIds === []) {
        return [];
    }
    $in = implode(',', array_fill(0, count($taskIds), '?'));
    $stmt = $pdo->prepare("SELECT task_id, contact_id FROM join_task_contacts WHERE task_id IN ($in)");
    $stmt->execute($taskIds);
    $grouped = [];
    foreach ($stmt->fetchAll() as $row) {
        $grouped[$row['task_id']][] = $row['contact_id'];
    }
    return $grouped;
}
