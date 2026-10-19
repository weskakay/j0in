<?php

/** The states a project moves through, in the order they are offered. */
const J0IN_PROJECT_STATES = ['planning', 'active', 'review', 'shipped'];

/** The icons a project can carry; the drawings live in the frontend. */
const J0IN_PROJECT_ICONS = [
    'spark', 'rocket', 'phone', 'brush', 'code', 'chart', 'book', 'flag', 'heart', 'globe', 'box', 'star',
];

/** The colour a project gets when none was picked. */
const J0IN_PROJECT_COLOR = '#1FD7C1';

/** Adds a project to the board. */
function createCategory(PDO $pdo, string $boardId, array $body): void
{
    $fields = projectFields($body);
    $id = uuid();
    $stmt = $pdo->prepare(
        'INSERT INTO join_categories (id, board_id, name, color, icon, description, status, due_date, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM join_categories c WHERE c.board_id = ?))'
    );
    $stmt->execute([$id, $boardId, ...array_values($fields), $boardId]);
    respond(201, ['id' => $id]);
}

/** Saves a project: name and colour always, the rest as far as it was sent. */
function updateCategory(PDO $pdo, string $boardId, string $categoryId, array $body): void
{
    requireOwnCategory($pdo, $boardId, $categoryId);
    $fields = projectFields($body);
    $stmt = $pdo->prepare(
        'UPDATE join_categories SET name = ?, color = ?,
         icon = IF(?, ?, icon), description = IF(?, ?, description),
         status = IF(?, ?, status), due_date = IF(?, ?, due_date) WHERE id = ?'
    );
    $stmt->execute([$fields['name'], $fields['color'], ...sentPairs($body, $fields), $categoryId]);
    respond(200, ['ok' => true]);
}

/**
 * For each optional field a flag whether it was sent and its value, so a
 * caller that only knows name and colour does not wipe the rest.
 *
 * @return list<mixed>
 */
function sentPairs(array $body, array $fields): array
{
    $pairs = [];
    foreach (['icon', 'description', 'status', 'dueDate'] as $key) {
        $pairs[] = array_key_exists($key, $body) ? 1 : 0;
        $pairs[] = $fields[$key];
    }
    return $pairs;
}

/**
 * The checked fields of a project, in the order the queries use them.
 *
 * @return array{name: string, color: string, icon: ?string, description: ?string, status: string, dueDate: ?string}
 */
function projectFields(array $body): array
{
    return [
        'name' => projectName($body),
        'color' => projectColor($body),
        'icon' => pickFrom($body, 'icon', J0IN_PROJECT_ICONS, 'category.bad_icon'),
        'description' => projectDescription($body),
        'status' => pickFrom($body, 'status', J0IN_PROJECT_STATES, 'category.bad_status') ?? 'active',
        'dueDate' => projectDate($body),
    ];
}

/** The name, required and at most 80 characters like its column. */
function projectName(array $body): string
{
    $name = bodyString($body, 'name');
    if ($name === '') {
        fail(422, 'category.name_required');
    }
    if (mb_strlen($name) > 80) {
        fail(422, 'category.name_too_long');
    }
    return $name;
}

/** The colour as #rrggbb, or the default one when none was sent. */
function projectColor(array $body): string
{
    $color = bodyString($body, 'color');
    if ($color === '') {
        return J0IN_PROJECT_COLOR;
    }
    if (!preg_match('/^#[0-9a-fA-F]{6}$/', $color)) {
        fail(422, 'category.bad_color');
    }
    return $color;
}

/** A value that must come from a fixed list, or null when none was sent. */
function pickFrom(array $body, string $key, array $allowed, string $error): ?string
{
    $value = bodyString($body, $key);
    if ($value === '') {
        return null;
    }
    if (!in_array($value, $allowed, true)) {
        fail(422, $error);
    }
    return $value;
}

/** The description, at most 300 characters, or null. */
function projectDescription(array $body): ?string
{
    $text = bodyString($body, 'description');
    if (mb_strlen($text) > 300) {
        fail(422, 'category.description_too_long');
    }
    return blankToNull($text);
}

/** The due date as YYYY-MM-DD, or null. */
function projectDate(array $body): ?string
{
    $date = bodyString($body, 'dueDate');
    $valid = preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $date, $parts) === 1
        && checkdate((int) $parts[2], (int) $parts[3], (int) $parts[1]);
    if ($date !== '' && !$valid) {
        fail(422, 'category.bad_date');
    }
    return blankToNull($date);
}

/** Pins a project to the sidebar or takes it off again. */
function pinCategory(PDO $pdo, string $boardId, string $categoryId, array $body): void
{
    requireOwnCategory($pdo, $boardId, $categoryId);
    $pinned = $body['pinned'] ?? null;
    if (!is_bool($pinned)) {
        fail(422, 'category.bad_pin');
    }
    $pdo->prepare('UPDATE join_categories SET pinned = ? WHERE id = ?')->execute([$pinned ? 1 : 0, $categoryId]);
    respond(200, ['ok' => true]);
}

/**
 * Deletes a project. Tasks keep existing and simply lose it, which is why
 * the foreign key sets null instead of cascading.
 */
function deleteCategory(PDO $pdo, string $boardId, string $categoryId): void
{
    requireOwnCategory($pdo, $boardId, $categoryId);
    $pdo->prepare('DELETE FROM join_categories WHERE id = ?')->execute([$categoryId]);
    respond(200, ['ok' => true]);
}
