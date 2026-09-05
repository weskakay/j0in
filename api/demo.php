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
        'title' => ['de' => 'Karte öffnen und abhaken', 'en' => 'Open a card and tick it off'],
        'text' => ['de' => 'Tippe die Karte an, hake eine Teilaufgabe ab und schließe den Dialog wieder.', 'en' => 'Tap the card, tick a subtask off and close the dialog again.'],
        'due' => '+2 days',
        'priority' => 'urgent',
        'people' => [0, 1],
        'subtasks' => ['de' => [['Karte öffnen', true], ['Teilaufgabe abhaken', false], ['Dialog schließen', false]], 'en' => [['Open the card', true], ['Tick a subtask', false], ['Close the dialog', false]]],
    ],
    [
        'column' => 'ToDo',
        'category' => 'Technical Task',
        'title' => ['de' => 'Eigene Aufgabe anlegen', 'en' => 'Add a task of your own'],
        'text' => ['de' => 'Das Plus in der Spaltenüberschrift öffnet ein leeres Formular.', 'en' => 'The plus in the column heading opens an empty form.'],
        'due' => '+6 days',
        'priority' => 'medium',
        'people' => [],
        'subtasks' => ['de' => [], 'en' => []],
    ],
    [
        'column' => 'ToDo',
        'category' => 'User Story',
        'title' => ['de' => 'Frist und Priorität setzen', 'en' => 'Set a deadline and a priority'],
        'text' => ['de' => 'Beides steht im Dialog. Die Priorität färbt den Hinweis unten rechts auf der Karte.', 'en' => 'Both live in the dialog. The priority colours the note at the bottom right of the card.'],
        'due' => '+9 days',
        'priority' => 'low',
        'people' => [2],
        'subtasks' => ['de' => [['Frist wählen', true], ['Priorität wählen', false]], 'en' => [['Pick a deadline', true], ['Pick a priority', false]]],
    ],
    [
        'column' => 'In Progress',
        'category' => 'User Story',
        'title' => ['de' => 'Karte in eine andere Spalte ziehen', 'en' => 'Drag a card into another column'],
        'text' => ['de' => 'Am Rechner die Karte greifen, am Handy den Anfasser rechts oben benutzen.', 'en' => 'On a desktop grab the card itself, on a phone use the grip at its top right.'],
        'due' => '+1 day',
        'priority' => 'urgent',
        'people' => [0],
        'subtasks' => ['de' => [['Am Rechner ziehen', true], ['Am Handy ziehen', false]], 'en' => [['Drag on a desktop', true], ['Drag on a phone', false]]],
    ],
    [
        'column' => 'In Progress',
        'category' => 'Technical Task',
        'title' => ['de' => 'Spalte anlegen oder umbenennen', 'en' => 'Add or rename a column'],
        'text' => ['de' => 'Spalten sind frei wählbar. Lege eine an und ziehe sie an die gewünschte Stelle.', 'en' => 'Columns are yours to choose. Add one and drag it where you want it.'],
        'due' => '+5 days',
        'priority' => 'medium',
        'people' => [2],
        'subtasks' => ['de' => [['Spalte hinzufügen', false], ['Überschrift ändern', false]], 'en' => [['Add a column', false], ['Change the heading', false]]],
    ],
    [
        'column' => 'In Progress',
        'category' => 'Technical Task',
        'title' => ['de' => 'Kontakt zuweisen', 'en' => 'Assign a contact'],
        'text' => ['de' => 'Zugewiesene Personen erscheinen als farbige Kürzel am Fuß der Karte.', 'en' => 'Assigned people show up as coloured initials at the foot of the card.'],
        'due' => '+8 days',
        'priority' => 'low',
        'people' => [1],
        'subtasks' => ['de' => [], 'en' => []],
    ],
    [
        'column' => 'Awaiting Feedback',
        'category' => 'Technical Task',
        'title' => ['de' => 'Suche benutzen', 'en' => 'Use the search'],
        'text' => ['de' => 'Das Feld oben rechts filtert nach Titel und Beschreibung.', 'en' => 'The field at the top right filters by title and description.'],
        'due' => '+3 days',
        'priority' => 'medium',
        'people' => [1],
        'subtasks' => ['de' => [], 'en' => []],
    ],
    [
        'column' => 'Awaiting Feedback',
        'category' => 'User Story',
        'title' => ['de' => 'Kategorie anlegen und einfärben', 'en' => 'Add a category and colour it'],
        'text' => ['de' => 'In den Einstellungen bekommt jede Kategorie einen Namen und eine Farbe.', 'en' => 'In the settings every category gets a name and a colour.'],
        'due' => '+7 days',
        'priority' => 'low',
        'people' => [0, 2],
        'subtasks' => ['de' => [['Kategorie anlegen', true], ['Farbe wählen', false]], 'en' => [['Add a category', true], ['Pick a colour', false]]],
    ],
    [
        'column' => 'Awaiting Feedback',
        'category' => 'Technical Task',
        'title' => ['de' => 'Übersicht ansehen', 'en' => 'Look at the overview'],
        'text' => ['de' => 'Der Ring zeigt den Fortschritt, der Streifen darunter die nächsten Fristen.', 'en' => 'The ring shows the progress, the strip below it the deadlines ahead.'],
        'due' => '+11 days',
        'priority' => 'low',
        'people' => [],
        'subtasks' => ['de' => [], 'en' => []],
    ],
    [
        'column' => 'Done',
        'category' => 'Technical Task',
        'title' => ['de' => 'Board geladen', 'en' => 'Board loaded'],
        'text' => ['de' => 'Spalten, Karten, Teilaufgaben und Kontakte kommen in einem einzigen Aufruf.', 'en' => 'Columns, cards, subtasks and contacts arrive in one single request.'],
        'due' => '-1 day',
        'priority' => 'low',
        'people' => [0, 2],
        'subtasks' => ['de' => [['Lesen', true], ['Anzeigen', true]], 'en' => [['Read', true], ['Render', true]]],
    ],
    [
        'column' => 'Done',
        'category' => 'User Story',
        'title' => ['de' => 'Erscheinungsbild gewählt', 'en' => 'Appearance chosen'],
        'text' => ['de' => 'Hell oder dunkel und die Akzentfarbe stehen in den Einstellungen.', 'en' => 'Light or dark and the accent colour live in the settings.'],
        'due' => '-3 days',
        'priority' => 'medium',
        'people' => [1],
        'subtasks' => ['de' => [['Hell oder dunkel', true], ['Akzentfarbe', true]], 'en' => [['Light or dark', true], ['Accent colour', true]]],
    ],
    [
        'column' => 'Done',
        'category' => 'Technical Task',
        'title' => ['de' => 'Kontakte angelegt', 'en' => 'Contacts added'],
        'text' => ['de' => 'Die Personen aus dem Adressbuch lassen sich jeder Karte zuweisen.', 'en' => 'The people from the address book can be assigned to any card.'],
        'due' => '-6 days',
        'priority' => 'low',
        'people' => [0, 1, 2],
        'subtasks' => ['de' => [], 'en' => []],
    ],
];

/**
 * Fills a fresh demo board, so a visitor lands on something to try out.
 * The wording follows the language the visitor arrived with.
 */
function fillDemoBoard(PDO $pdo, string $boardId, string $lang = 'de'): void
{
    $contacts = insertDemoContacts($pdo, $boardId);
    $columns = idsByName($pdo, 'join_columns', $boardId);
    $categories = idsByName($pdo, 'join_categories', $boardId);
    foreach (J0IN_DEMO_TASKS as $index => $task) {
        insertDemoTask($pdo, inLanguage($task, $lang), $columns, $categories, $contacts, $index);
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
    insertStartColumns($pdo, $boardId);
    insertStartCategories($pdo, $boardId);
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

/** Writes one demo card with its subtasks and assignees. */
function insertDemoTask(
    PDO $pdo,
    array $task,
    array $columns,
    array $categories,
    array $contacts,
    int $index
): void {
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
    $pdo->prepare('UPDATE join_tasks SET demo_index = ? WHERE id = ?')->execute([$index, $id]);
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
