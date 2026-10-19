<?php

// Reading the day out of Google Calendar. The access token lives an hour, so
// every call checks it first and renews it from the refresh token if needed.

const J0IN_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/%s/events?%s';

/** The longest span one request may ask for: six weeks, a month view. */
const J0IN_MAX_SPAN_DAYS = 42;

/** Seconds of headroom, so a token does not expire mid-request. */
const J0IN_TOKEN_MARGIN = 60;

/** Answers with the events of one day, or of a span up to `to`, oldest first. */
function readDay(PDO $pdo, array $user): void
{
    $account = usableAccount($pdo, $user['id']);
    if ($account === null) {
        fail(409, 'calendar.not_connected');
    }
    $day = dayOrToday((string) ($_GET['date'] ?? ''));
    $to = spanEnd($day, (string) ($_GET['to'] ?? ''));
    $zone = zoneOrUtc((string) ($_GET['tz'] ?? ''));
    $token = freshAccessToken($pdo, $account);
    $events = fetchEvents($account, $token, [$day, $to], $zone);
    respond(200, ['date' => $day, 'to' => $to, 'events' => withTaskIds($pdo, $events)]);
}

/** The last day of a span: the wanted one, if it lies within six weeks after the first. */
function spanEnd(string $from, string $wanted): string
{
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $wanted) !== 1) {
        return $from;
    }
    $days = (strtotime($wanted) - strtotime($from)) / 86400;
    return $days >= 0 && $days <= J0IN_MAX_SPAN_DAYS ? $wanted : $from;
}

/** The wanted day, or today when nothing usable was asked for. */
function dayOrToday(string $wanted): string
{
    return preg_match('/^\d{4}-\d{2}-\d{2}$/', $wanted) === 1 ? $wanted : date('Y-m-d');
}

/**
 * A usable access token. Renews it when it is spent, and writes the new one
 * back, so the next request does not have to ask Google again.
 */
function freshAccessToken(PDO $pdo, array $account): string
{
    if (strtotime((string) $account['expires_at']) - J0IN_TOKEN_MARGIN > time()) {
        return unseal((string) $account['access_token']);
    }
    $token = renewToken(unseal((string) $account['refresh_token']));
    storeRenewed($pdo, (string) $account['user_id'], $token);
    return (string) $token['access_token'];
}

/**
 * Trades the refresh token for a new access token.
 *
 * @return array<string, mixed>
 */
function renewToken(string $refresh): array
{
    $google = googleConfig();
    return postToGoogle([
        'client_id' => (string) $google['client_id'],
        'client_secret' => (string) $google['client_secret'],
        'refresh_token' => $refresh,
        'grant_type' => 'refresh_token',
    ]);
}

/** Writes the renewed access token back, leaving the refresh token alone. */
function storeRenewed(PDO $pdo, string $userId, array $token): void
{
    $expires = date('Y-m-d H:i:s', time() + (int) ($token['expires_in'] ?? 3600));
    $stmt = $pdo->prepare(
        'UPDATE join_google_accounts SET access_token = ?, expires_at = ? WHERE user_id = ?'
    );
    $stmt->execute([seal((string) $token['access_token']), $expires, $userId]);
}

/**
 * The events from the first to the last day of a span, as the screen needs them.
 *
 * @param array{0: string, 1: string} $span
 * @return list<array<string, mixed>>
 */
function fetchEvents(array $account, string $token, array $span, DateTimeZone $zone): array
{
    $query = http_build_query([
        'timeMin' => moment($span[0] . ' 00:00:00', $zone),
        'timeMax' => moment($span[1] . ' 23:59:59', $zone),
        'singleEvents' => 'true',
        'orderBy' => 'startTime',
        'maxResults' => '250',
    ]);
    $url = sprintf(J0IN_EVENTS_URL, rawurlencode((string) $account['calendar_id']), $query);
    return array_map('plainEvent', itemsOf(getFromGoogle($url, $token)));
}

/**
 * The items of an answer, or none when Google sent something else.
 *
 * @return list<array<string, mixed>>
 */
function itemsOf(array $answer): array
{
    $items = $answer['items'] ?? [];
    return is_array($items) ? array_values($items) : [];
}

/**
 * One event reduced to what the day column shows.
 *
 * @return array<string, mixed>
 */
function plainEvent(array $event): array
{
    $start = $event['start'] ?? [];
    $end = $event['end'] ?? [];
    return [
        'id' => (string) ($event['id'] ?? ''),
        'title' => (string) ($event['summary'] ?? ''),
        'start' => (string) ($start['dateTime'] ?? $start['date'] ?? ''),
        'end' => (string) ($end['dateTime'] ?? $end['date'] ?? ''),
        'allDay' => isset($start['date']),
    ];
}

/**
 * Marks the events that came from a card, so the day can tell them apart and
 * offer to take them out again.
 *
 * @param list<array<string, mixed>> $events
 * @return list<array<string, mixed>>
 */
function withTaskIds(PDO $pdo, array $events): array
{
    $byEvent = taskIdsByEvent($pdo, array_column($events, 'id'));
    foreach ($events as $index => $event) {
        $events[$index]['taskId'] = $byEvent[$event['id']] ?? null;
    }
    return $events;
}

/**
 * Which of these events belong to a card.
 *
 * @param list<string> $eventIds
 * @return array<string, string>
 */
function taskIdsByEvent(PDO $pdo, array $eventIds): array
{
    if ($eventIds === []) {
        return [];
    }
    $marks = implode(',', array_fill(0, count($eventIds), '?'));
    $stmt = $pdo->prepare("SELECT event_id, task_id FROM join_task_events WHERE event_id IN ({$marks})");
    $stmt->execute($eventIds);
    return array_column($stmt->fetchAll(), 'task_id', 'event_id');
}

/**
 * The zone the reader sits in. An unknown name is not worth an error, the
 * day is then simply cut in UTC.
 */
function zoneOrUtc(string $name): DateTimeZone
{
    try {
        return new DateTimeZone($name === '' ? 'UTC' : $name);
    } catch (Exception $e) {
        return new DateTimeZone('UTC');
    }
}

/** One moment, written the way Google wants it, in the reader's own zone. */
function moment(string $when, DateTimeZone $zone): string
{
    return (new DateTimeImmutable($when, $zone))->format('c');
}

/**
 * Reads a URL at Google with the access token.
 *
 * @return array<string, mixed>
 */
function getFromGoogle(string $url, string $token): array
{
    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token],
    ]);
    $body = (string) curl_exec($curl);
    $failed = curl_errno($curl) !== 0 || curl_getinfo($curl, CURLINFO_RESPONSE_CODE) >= 400;
    curl_close($curl);
    if ($failed) {
        fail(502, 'calendar.google_refused');
    }
    return decodeAnswer($body);
}

/**
 * Turns an answer into an array, refusing anything else.
 *
 * @return array<string, mixed>
 */
function decodeAnswer(string $body): array
{
    $answer = json_decode($body, true);
    if (!is_array($answer)) {
        fail(502, 'calendar.google_refused');
    }
    return $answer;
}

/**
 * Start and end of the wanted block, in the zone the reader sits in.
 *
 * @return array{start: string, end: string, zone: string}
 */
/** Creates the event at Google, or moves the one this card already has. */
/** The event id this card already carries, or null. */
/**
 * What the event looks like in the calendar. The card's title carries over,
 * so the day reads the same on both sides.
 *
 * @return array<string, mixed>
 */
/** Notes which event belongs to which card. */
/** Takes a card back out of the day and removes its event. */
/** Removes one event at Google, tolerating one that is already gone. */
/**
 * Sends a request to Google with the access token.
 *
 * @param array<string, mixed>|null $body
 * @return array<string, mixed>
 */
/**
 * The curl options for a request carrying JSON.
 *
 * @param array<string, mixed>|null $body
 * @return array<int, mixed>
 */
/** The address of one event in the connected calendar. */
/**
 * Removes the calendar entries of the given cards. Called before the cards
 * themselves go, so nothing is left standing in the calendar.
 *
 * @param list<string> $taskIds
 */
/**
 * The events belonging to these cards.
 *
 * @param list<string> $taskIds
 * @return list<string>
 */
/**
 * Removes one event and swallows every problem. Deleting a card must work
 * even when Google is unreachable; a stray entry is the smaller evil.
 */
/**
 * The cards sitting in one column.
 *
 * @return list<string>
 */
