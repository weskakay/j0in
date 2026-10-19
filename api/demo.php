<?php

/**
 * Fills a fresh demo board, so a visitor lands on something to try out.
 * The wording follows the language the visitor arrived with.
 */
function fillDemoBoard(PDO $pdo, string $boardId, string $lang = 'de'): void
{
    $contacts = insertDemoContacts($pdo, $boardId);
    $columns = idsByName($pdo, 'join_columns', $boardId);
    $categories = idsByName($pdo, 'join_categories', $boardId);
    $phases = phaseIdsInOrder($pdo, $boardId);
    foreach (J0IN_DEMO_TASKS as $index => $task) {
        $id = insertDemoTask($pdo, inLanguage($task, $lang), $columns, $categories, $contacts, $index);
        if ($id !== null) {
            insertDemoTime($pdo, $id, $phases, $task['time'] ?? []);
            stampDemoDone($pdo, $id, $task['done'] ?? null);
        }
    }
}

/** Gives a finished demo card the moment it was finished, spread over the last days. */
function stampDemoDone(PDO $pdo, string $taskId, ?string $when): void
{
    if ($when === null) {
        return;
    }
    $pdo->prepare('UPDATE join_tasks SET done_at = ? WHERE id = ?')
        ->execute([date('Y-m-d H:i:s', strtotime($when)), $taskId]);
}

/** Books the demo minutes of a card, each on the phase at the given position. */
function insertDemoTime(PDO $pdo, string $taskId, array $phases, array $time): void
{
    foreach ($time as [$phase, $minutes]) {
        insertTimeRow($pdo, $taskId, $phases[$phase] ?? null, $minutes, null);
    }
}

/**
 * Puts the whole guest board back: columns, categories, cards, contacts and
 * the board's own name. The date it happened on is stamped alongside, so the
 * next visitor of the same day keeps whatever was changed in the meantime.
 */
function rebuildDemoBoard(PDO $pdo, string $boardId, string $lang = 'de'): void
{
    clearBoard($pdo, $boardId);
    $pdo->prepare('DELETE FROM join_columns WHERE board_id = ?')->execute([$boardId]);
    $pdo->prepare('DELETE FROM join_categories WHERE board_id = ?')->execute([$boardId]);
    $pdo->prepare('DELETE FROM join_time_phases WHERE board_id = ?')->execute([$boardId]);
    insertStartColumns($pdo, $boardId);
    insertStartCategories($pdo, $boardId);
    insertStartPhases($pdo, $boardId, $lang);
    $pdo->prepare('UPDATE join_boards SET name = ?, demo_reset_on = CURDATE() WHERE id = ?')
        ->execute([boardNameIn($lang), $boardId]);
    fillDemoBoard($pdo, $boardId, $lang);
}

/** What the guest board is called, in each language it is offered in. */
const J0IN_DEMO_BOARD_NAME = ['de' => 'Demo-Board', 'en' => 'Demo board'];

/** The name a board gets, written the way the chosen language does. */
function boardNameIn(string $lang): string
{
    return J0IN_DEMO_BOARD_NAME[$lang] ?? J0IN_DEMO_BOARD_NAME['de'];
}

/**
 * Picks one language out of a demo card, so the rest of the code works with
 * plain strings and never has to know that two versions exist.
 *
 * @return array<string, mixed>
 */
function inLanguage(array $task, string $lang): array
{
    $key = $lang === 'en' ? 'en' : 'de';
    foreach (['title', 'text', 'subtasks'] as $field) {
        $task[$field] = $task[$field][$key] ?? $task[$field]['de'];
    }
    return $task;
}

/**
 * Adds the demo contacts and returns their ids in order.
 *
 * @return list<string>
 */
function insertDemoContacts(PDO $pdo, string $boardId): array
{
    $stmt = $pdo->prepare(
        'INSERT INTO join_contacts (id, board_id, name, email, color) VALUES (?, ?, ?, ?, ?)'
    );
    $ids = [];
    foreach (J0IN_DEMO_CONTACTS as [$name, $email]) {
        $id = uuid();
        $stmt->execute([$id, $boardId, $name, $email, pickColor($name)]);
        $ids[] = $id;
    }
    return $ids;
}

/**
 * Maps the names of a board's columns or categories to their ids.
 *
 * @return array<string, string>
 */
function idsByName(PDO $pdo, string $table, string $boardId): array
{
    $stmt = $pdo->prepare("SELECT id, name FROM {$table} WHERE board_id = ?");
    $stmt->execute([$boardId]);
    return array_column($stmt->fetchAll(), 'id', 'name');
}

/**
 * Writes one demo card with its subtasks and assignees and returns its id,
 * or null when the board has no column of that name any more.
 */
function insertDemoTask(
    PDO $pdo,
    array $task,
    array $columns,
    array $categories,
    array $contacts,
    int $index
): ?string {
    $columnId = $columns[$task['column']] ?? null;
    if ($columnId === null) {
        return null;
    }
    $id = insertTaskRow($pdo, $columnId, demoTaskFields($task, $categories));
    $pdo->prepare('UPDATE join_tasks SET demo_index = ? WHERE id = ?')->execute([$index, $id]);
    replaceSubtasks($pdo, $id, subtaskRows($task['subtasks']));
    replaceAssignees($pdo, columnBoard($pdo, $columnId), $id, pickContacts($contacts, $task['people']));
    return $id;
}

/**
 * The fields of a demo card in the shape insertTaskRow expects.
 *
 * @return array<string, mixed>
 */
function demoTaskFields(array $task, array $categories): array
{
    return [
        'categoryId' => $categories[$task['category']] ?? '',
        'title' => $task['title'],
        'description' => $task['text'],
        'dueDate' => date('Y-m-d', strtotime($task['due'])),
        'priority' => $task['priority'],
        'estimateMinutes' => $task['estimate'] ?? null,
    ];
}

/**
 * Turns the compact demo notation into what replaceSubtasks expects.
 *
 * @return list<array{title: string, isDone: bool}>
 */
function subtaskRows(array $subtasks): array
{
    $rows = [];
    foreach ($subtasks as [$title, $isDone]) {
        $rows[] = ['title' => $title, 'isDone' => $isDone];
    }
    return $rows;
}

/**
 * Picks the demo contacts a card is assigned to.
 *
 * @return list<string>
 */
function pickContacts(array $contacts, array $indexes): array
{
    $ids = [];
    foreach ($indexes as $index) {
        if (isset($contacts[$index])) {
            $ids[] = $contacts[$index];
        }
    }
    return $ids;
}

/** The board a column belongs to. */
function columnBoard(PDO $pdo, string $columnId): string
{
    $stmt = $pdo->prepare('SELECT board_id FROM join_columns WHERE id = ?');
    $stmt->execute([$columnId]);
    return (string) $stmt->fetchColumn();
}

/**
 * Rewrites the seeded cards of a board in another language. Cards a visitor
 * wrote carry no marker and are left exactly as they were typed.
 */
function rewriteDemoText(PDO $pdo, string $boardId, string $lang): void
{
    foreach (seededTasks($pdo, $boardId) as $row) {
        $task = J0IN_DEMO_TASKS[(int) $row['demo_index']] ?? null;
        if ($task !== null) {
            rewriteOneTask($pdo, (string) $row['id'], inLanguage($task, $lang));
        }
    }
}

/**
 * The seeded cards of a board, newest marker first.
 *
 * @return list<array<string, mixed>>
 */
function seededTasks(PDO $pdo, string $boardId): array
{
    $stmt = $pdo->prepare(
        'SELECT t.id, t.demo_index FROM join_tasks t
         JOIN join_columns c ON c.id = t.column_id
         WHERE c.board_id = ? AND t.demo_index IS NOT NULL'
    );
    $stmt->execute([$boardId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/** Puts the other language into one card, keeping what is ticked off. */
function rewriteOneTask(PDO $pdo, string $taskId, array $task): void
{
    $pdo->prepare('UPDATE join_tasks SET title = ?, description = ? WHERE id = ?')
        ->execute([$task['title'], $task['text'], $taskId]);
    $stmt = $pdo->prepare('UPDATE join_subtasks SET title = ? WHERE task_id = ? AND position = ?');
    foreach ($task['subtasks'] as $index => [$title, $isDone]) {
        $stmt->execute([$title, $taskId, $index + 1]);
    }
}
