<?php

/** What a board can be tuned to, with the range each value may take. */
const J0IN_PREFERENCES = [
    'weekCapacity' => ['week_capacity', 1, 80],
    'focusGoal' => ['focus_goal', 15, 600],
    'focusDefault' => ['focus_default', 15, 50],
];

/**
 * The board's own figures: the hours a person has in a week, the focus a
 * day aims for in minutes, and the length a focus run starts with.
 *
 * @return array<string, int>
 */
function readPreferences(PDO $pdo, string $boardId): array
{
    $stmt = $pdo->prepare('SELECT week_capacity, focus_goal, focus_default FROM join_boards WHERE id = ?');
    $stmt->execute([$boardId]);
    $row = $stmt->fetch() ?: [];
    $values = [];
    foreach (J0IN_PREFERENCES as $key => [$column]) {
        $values[$key] = (int) ($row[$column] ?? 0);
    }
    return $values;
}

/** Saves the figures that were sent, all checked before any is written. */
function savePreferences(PDO $pdo, string $boardId, array $body): void
{
    $values = [];
    foreach (J0IN_PREFERENCES as $key => [$column, $min, $max]) {
        if (array_key_exists($key, $body)) {
            $values[$column] = preferenceValue($body[$key], $min, $max, $key === 'focusDefault');
        }
    }
    foreach ($values as $column => $value) {
        $pdo->prepare("UPDATE join_boards SET {$column} = ? WHERE id = ?")->execute([$value, $boardId]);
    }
    respond(200, ['ok' => true]);
}

/** A whole number inside its range; the focus length must be one on offer. */
function preferenceValue(mixed $value, int $min, int $max, bool $focusLength): int
{
    $valid = is_int($value) && $value >= $min && $value <= $max;
    if (!$valid || ($focusLength && !in_array($value, J0IN_FOCUS_LENGTHS, true))) {
        fail(422, 'board.bad_preference');
    }
    return $value;
}
