<?php

const J0IN_CONTACT_COLORS = ['#FF7A00', '#9327FF', '#1FD7C1', '#462F8A', '#FF4646', '#00BEE8'];

/** Adds a contact to the board. */
function createContact(PDO $pdo, string $boardId, array $body): void
{
    $name = bodyString($body, 'name');
    if ($name === '') {
        fail(422, 'contact.name_required');
    }
    $id = uuid();
    $stmt = $pdo->prepare(
        'INSERT INTO join_contacts (id, board_id, name, email, phone, color) VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$id, $boardId, $name, blankToNull(bodyString($body, 'email')),
        blankToNull(bodyString($body, 'phone')), pickColor($name)]);
    respond(201, ['id' => $id]);
}

/** Picks a stable colour from the name, so it never changes on reload. */
function pickColor(string $name): string
{
    $index = crc32($name) % count(J0IN_CONTACT_COLORS);
    return J0IN_CONTACT_COLORS[$index];
}

/** Updates name, email or phone of a contact. */
function updateContact(PDO $pdo, string $boardId, string $contactId, array $body): void
{
    requireOwnContact($pdo, $boardId, $contactId);
    $name = bodyString($body, 'name');
    if ($name === '') {
        fail(422, 'contact.name_required');
    }
    $stmt = $pdo->prepare('UPDATE join_contacts SET name = ?, email = ?, phone = ? WHERE id = ?');
    $stmt->execute([$name, blankToNull(bodyString($body, 'email')),
        blankToNull(bodyString($body, 'phone')), $contactId]);
    respond(200, ['ok' => true]);
}

/**
 * Deletes a contact. Its assignments disappear from every task on their own,
 * because the database cascades them.
 */
function deleteContact(PDO $pdo, string $boardId, string $contactId): void
{
    requireOwnContact($pdo, $boardId, $contactId);
    $pdo->prepare('DELETE FROM join_contacts WHERE id = ?')->execute([$contactId]);
    respond(200, ['ok' => true]);
}

/** Ends the request with 404 when the contact belongs to another board. */
function requireOwnContact(PDO $pdo, string $boardId, string $contactId): void
{
    $stmt = $pdo->prepare('SELECT 1 FROM join_contacts WHERE id = ? AND board_id = ?');
    $stmt->execute([$contactId, $boardId]);
    if (!$stmt->fetch()) {
        fail(404, 'contact.not_found');
    }
}

/** Ends the request with 404 when the category belongs to another board. */
function requireOwnCategory(PDO $pdo, string $boardId, string $categoryId): void
{
    $stmt = $pdo->prepare('SELECT 1 FROM join_categories WHERE id = ? AND board_id = ?');
    $stmt->execute([$categoryId, $boardId]);
    if (!$stmt->fetch()) {
        fail(404, 'category.not_found');
    }
}
