<?php

// The cards a visitor finds on the guest board. Kept here so the demo can be
// changed without touching the sign-in code.
const J0IN_DEMO_CONTACTS = [
    ['Josefin Brandt', 'josefin.brandt@example.org'],
    ['Nuno Sanchez', 'nuno.sanchez@example.org'],
    ['Marek Nowak', 'marek.nowak@example.org'],
];

const J0IN_DEMO_TASKS = [
    [
        'column' => 'ToDo',
        'category' => 'User Story',
        'title' => 'Karte ausprobieren',
        'text' => 'Tippe die Karte an, hake eine Teilaufgabe ab und schließe den Dialog wieder.',
        'due' => '+3 days',
        'priority' => 'urgent',
        'people' => [0, 1],
        'subtasks' => [['Karte öffnen', true], ['Teilaufgabe abhaken', false], ['Dialog schließen', false]],
    ],
    [
        'column' => 'ToDo',
        'category' => 'Technical Task',
        'title' => 'Eigene Aufgabe anlegen',
        'text' => 'Das Plus in der Spaltenüberschrift öffnet ein leeres Formular.',
        'due' => '+7 days',
        'priority' => 'medium',
        'people' => [],
        'subtasks' => [],
    ],
    [
        'column' => 'In Progress',
        'category' => 'User Story',
        'title' => 'Karte in eine andere Spalte ziehen',
        'text' => 'Am Rechner die Karte greifen, am Handy den Anfasser rechts oben benutzen.',
        'due' => '+5 days',
        'priority' => 'medium',
        'people' => [2],
        'subtasks' => [['Am Rechner ziehen', false], ['Am Handy ziehen', false]],
    ],
    [
        'column' => 'Awaiting Feedback',
        'category' => 'Technical Task',
        'title' => 'Suche benutzen',
        'text' => 'Das Feld oben rechts filtert nach Titel und Beschreibung.',
        'due' => '+10 days',
        'priority' => 'low',
        'people' => [1],
        'subtasks' => [],
    ],
    [
        'column' => 'Done',
        'category' => 'Technical Task',
        'title' => 'Board geladen',
        'text' => 'Spalten, Karten, Teilaufgaben und Kontakte kommen in einem einzigen Aufruf.',
        'due' => '-1 day',
        'priority' => 'low',
        'people' => [0, 2],
        'subtasks' => [['Lesen', true], ['Anzeigen', true]],
    ],
];

/** Fills a fresh demo board, so a visitor lands on something to try out. */
function fillDemoBoard(PDO $pdo, string $boardId): void
{
    $contacts = insertDemoContacts($pdo, $boardId);
    $columns = idsByName($pdo, 'join_columns', $boardId);
    $categories = idsByName($pdo, 'join_categories', $boardId);
    foreach (J0IN_DEMO_TASKS as $task) {
        insertDemoTask($pdo, $task, $columns, $categories, $contacts);
    }
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

/** Writes one demo card with its subtasks and assignees. */
function insertDemoTask(PDO $pdo, array $task, array $columns, array $categories, array $contacts): void
{
    $columnId = $columns[$task['column']] ?? null;
    if ($columnId === null) {
        return;
    }
    $id = insertTaskRow($pdo, $columnId, [
        'categoryId' => $categories[$task['category']] ?? '',
        'title' => $task['title'],
        'description' => $task['text'],
        'dueDate' => date('Y-m-d', strtotime($task['due'])),
        'priority' => $task['priority'],
    ]);
    replaceSubtasks($pdo, $id, subtaskRows($task['subtasks']));
    replaceAssignees($pdo, columnBoard($pdo, $columnId), $id, pickContacts($contacts, $task['people']));
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
