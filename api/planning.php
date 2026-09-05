<?php

// Writing the board's cards into the calendar: laying one into the day,
// moving it, and clearing it away again when the card goes.

/** Puts a card into the day and writes the matching event to Google. */
function scheduleTask(PDO $pdo, string $boardId, array $user, string $taskId, array $body): void
{
    requireCalendarUser($user);
    requireOwnTask($pdo, $boardId, $taskId);
    $account = googleAccount($pdo, $user['id']);
    if ($account === null) {
        fail(409, 'calendar.not_connected');
    }
    $slot = slotFrom($body);
    $token = freshAccessToken($pdo, $account);
    $event = writeEvent($pdo, $account, $token, $taskId, $slot);
    rememberEvent($pdo, $taskId, $event, $slot);
    respond(200, ['ok' => true, 'eventId' => $event]);
}

/**
 * Start and end of the wanted block, in the zone the reader sits in.
 *
 * @return array{start: string, end: string, zone: string}
 */
function slotFrom(array $body): array
{
    $zone = zoneOrUtc((string) ($body['timeZone'] ?? ''));
    $day = dayOrToday((string) ($body['date'] ?? ''));
    $minutes = (int) ($body['minutes'] ?? 0);
    $length = max(15, (int) ($body['length'] ?? 60));
    $start = (new DateTimeImmutable($day . ' 00:00:00', $zone))->modify("+{$minutes} minutes");
    return [
        'start' => $start->format('c'),
        'end' => $start->modify("+{$length} minutes")->format('c'),
        'zone' => $zone->getName(),
    ];
}

/** Creates the event at Google, or moves the one this card already has. */
function writeEvent(PDO $pdo, array $account, string $token, string $taskId, array $slot): string
{
    $known = knownEvent($pdo, $taskId);
    $calendar = rawurlencode((string) $account['calendar_id']);
    $path = 'https://www.googleapis.com/calendar/v3/calendars/' . $calendar . '/events';
    $answer = $known === null
        ? sendToGoogle('POST', $path, $token, eventBody($pdo, $taskId, $slot))
        : sendToGoogle('PUT', $path . '/' . rawurlencode($known), $token, eventBody($pdo, $taskId, $slot));
    return (string) ($answer['id'] ?? $known ?? '');
}

/** The event id this card already carries, or null. */
function knownEvent(PDO $pdo, string $taskId): ?string
{
    $stmt = $pdo->prepare('SELECT event_id FROM join_task_events WHERE task_id = ?');
    $stmt->execute([$taskId]);
    $found = $stmt->fetchColumn();
    return $found === false ? null : (string) $found;
}

/**
 * What the event looks like in the calendar. The card's title carries over,
 * so the day reads the same on both sides.
 *
 * @return array<string, mixed>
 */
function eventBody(PDO $pdo, string $taskId, array $slot): array
{
    $stmt = $pdo->prepare('SELECT title FROM join_tasks WHERE id = ?');
    $stmt->execute([$taskId]);
    return [
        'summary' => (string) $stmt->fetchColumn(),
        'start' => ['dateTime' => $slot['start'], 'timeZone' => $slot['zone']],
        'end' => ['dateTime' => $slot['end'], 'timeZone' => $slot['zone']],
    ];
}

/** Notes which event belongs to which card. */
function rememberEvent(PDO $pdo, string $taskId, string $eventId, array $slot): void
{
    $stmt = $pdo->prepare(
        'REPLACE INTO join_task_events (task_id, event_id, starts_at, ends_at) VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([
        $taskId,
        $eventId,
        date('Y-m-d H:i:s', strtotime($slot['start'])),
        date('Y-m-d H:i:s', strtotime($slot['end'])),
    ]);
}

/** Takes a card back out of the day and removes its event. */
function unscheduleTask(PDO $pdo, string $boardId, array $user, string $taskId): void
{
    requireCalendarUser($user);
    requireOwnTask($pdo, $boardId, $taskId);
    $account = googleAccount($pdo, $user['id']);
    $known = knownEvent($pdo, $taskId);
    if ($account !== null && $known !== null) {
        dropEvent($account, freshAccessToken($pdo, $account), $known);
    }
    $pdo->prepare('DELETE FROM join_task_events WHERE task_id = ?')->execute([$taskId]);
    respond(200, ['ok' => true]);
}

/** Removes one event at Google, tolerating one that is already gone. */
function dropEvent(array $account, string $token, string $eventId): void
{
    sendToGoogle('DELETE', eventUrl($account, $eventId), $token, null, true);
}

/**
 * Sends a request to Google with the access token.
 *
 * @param array<string, mixed>|null $body
 * @return array<string, mixed>
 */
function sendToGoogle(string $method, string $url, string $token, ?array $body, bool $lenient = false): array
{
    $curl = curl_init($url);
    curl_setopt_array($curl, sendOptions($method, $token, $body));
    $answer = (string) curl_exec($curl);
    $code = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    $failed = curl_errno($curl) !== 0 || ($code >= 400 && !($lenient && $code < 500));
    curl_close($curl);
    if ($failed) {
        fail(502, 'calendar.google_refused');
    }
    return $answer === '' ? [] : decodeAnswer($answer);
}

/**
 * The curl options for a request carrying JSON.
 *
 * @param array<string, mixed>|null $body
 * @return array<int, mixed>
 */
function sendOptions(string $method, string $token, ?array $body): array
{
    $headers = ['Authorization: Bearer ' . $token, 'Content-Type: application/json'];
    $options = [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => $headers,
    ];
    if ($body !== null) {
        $options[CURLOPT_POSTFIELDS] = (string) json_encode($body);
    }
    return $options;
}

/** The address of one event in the connected calendar. */
function eventUrl(array $account, string $eventId): string
{
    return 'https://www.googleapis.com/calendar/v3/calendars/'
        . rawurlencode((string) $account['calendar_id'])
        . '/events/' . rawurlencode($eventId);
}

/**
 * Removes the calendar entries of the given cards. Called before the cards
 * themselves go, so nothing is left standing in the calendar.
 *
 * @param list<string> $taskIds
 */
function dropEventsOf(PDO $pdo, array $user, array $taskIds): void
{
    $events = eventIdsOf($pdo, $taskIds);
    $account = $events === [] ? null : googleAccount($pdo, $user['id']);
    if ($account === null) {
        return;
    }
    $token = freshAccessToken($pdo, $account);
    foreach ($events as $eventId) {
        dropEventQuietly($account, $token, $eventId);
    }
}

/**
 * The events belonging to these cards.
 *
 * @param list<string> $taskIds
 * @return list<string>
 */
function eventIdsOf(PDO $pdo, array $taskIds): array
{
    if ($taskIds === []) {
        return [];
    }
    $marks = implode(',', array_fill(0, count($taskIds), '?'));
    $stmt = $pdo->prepare("SELECT event_id FROM join_task_events WHERE task_id IN ({$marks})");
    $stmt->execute($taskIds);
    return array_column($stmt->fetchAll(), 'event_id');
}

/**
 * Removes one event and swallows every problem. Deleting a card must work
 * even when Google is unreachable; a stray entry is the smaller evil.
 */
function dropEventQuietly(array $account, string $token, string $eventId): void
{
    $curl = curl_init(eventUrl($account, $eventId));
    curl_setopt_array($curl, [
        CURLOPT_CUSTOMREQUEST => 'DELETE',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token],
    ]);
    curl_exec($curl);
    curl_close($curl);
}

/**
 * The cards sitting in one column.
 *
 * @return list<string>
 */
function taskIdsIn(PDO $pdo, string $columnId): array
{
    $stmt = $pdo->prepare('SELECT id FROM join_tasks WHERE column_id = ?');
    $stmt->execute([$columnId]);
    return array_column($stmt->fetchAll(), 'id');
}
