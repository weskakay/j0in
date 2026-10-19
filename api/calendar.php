<?php

// Connecting an account to Google Calendar. Only the person who owns the
// account ever connects, so there is exactly one Google account per user.

const J0IN_GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const J0IN_GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const J0IN_GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.events'
    . ' https://www.googleapis.com/auth/userinfo.email';

/** How long the handed-out state stays valid, in seconds. */
const J0IN_STATE_LIFETIME = 600;

/** Where the visitor lands again once Google has answered. */
const J0IN_RETURN_PATH = '/settings';

/** The Google block from config.php, empty while it is not set up. */
function googleConfig(): array
{
    static $google = null;
    if ($google === null) {
        $google = (array) (readConfig()['google'] ?? []);
    }
    return $google;
}

/** Whether the calendar can be offered at all on this server. */
function calendarReady(): bool
{
    $google = googleConfig();
    return extension_loaded('curl')
        && sealingReady()
        && ($google['client_id'] ?? '') !== ''
        && ($google['client_secret'] ?? '') !== '';
}

/**
 * Ends the request unless this account may reach the calendar at all. The
 * permission sits on the user row, so letting somebody else in later is a
 * value to change in the database, not code to deploy. The shared guest never
 * passes: a visitor must not be able to hang a real Google account on a board
 * that everybody else is looking at.
 */
function requireCalendarUser(array $user): void
{
    if ((int) ($user['calendar_enabled'] ?? 0) !== 1) {
        fail(403, 'calendar.not_allowed');
    }
}

/** Answers with the connection state of the signed-in user. */
function calendarStatus(PDO $pdo, array $user): void
{
    $row = usableAccount($pdo, $user['id']);
    respond(200, [
        'available' => calendarReady(),
        'connected' => $row !== null,
        'email' => $row['email'] ?? null,
        'calendarId' => $row['calendar_id'] ?? null,
    ]);
}

/**
 * The connected account of a user, ready to use. Null while the server has no
 * Google client set up, and forgotten when its tokens no longer open with the
 * current key, so the settings simply offer to connect again.
 */
function usableAccount(PDO $pdo, string $userId): ?array
{
    $account = googleAccount($pdo, $userId);
    if ($account === null || !calendarReady()) {
        return null;
    }
    try {
        unseal((string) $account['refresh_token']);
        return $account;
    } catch (RuntimeException | SodiumException $e) {
        $pdo->prepare('DELETE FROM join_google_accounts WHERE user_id = ?')->execute([$userId]);
        return null;
    }
}

/** The connected account of a user, or null when there is none. */
function googleAccount(PDO $pdo, string $userId): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM join_google_accounts WHERE user_id = ?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    return $row === false ? null : $row;
}

/** Sends the visitor to Google's consent screen. */
function startCalendarConnect(array $user): void
{
    if (!calendarReady()) {
        fail(503, 'calendar.not_configured');
    }
    $state = signValue($user['id'], time() + J0IN_STATE_LIFETIME);
    header('Location: ' . J0IN_GOOGLE_AUTH . '?' . http_build_query(consentQuery($state)));
    exit;
}

/**
 * What Google needs on the consent screen. The offline access and the forced
 * prompt are what makes it hand out a refresh token at all.
 *
 * @return array<string, string>
 */
function consentQuery(string $state): array
{
    $google = googleConfig();
    return [
        'client_id' => (string) $google['client_id'],
        'redirect_uri' => (string) $google['redirect_uri'],
        'response_type' => 'code',
        'scope' => J0IN_GOOGLE_SCOPE,
        'access_type' => 'offline',
        'prompt' => 'consent',
        'include_granted_scopes' => 'true',
        'state' => $state,
    ];
}

/** Takes the answer from Google and stores the tokens sealed. */
function finishCalendarConnect(PDO $pdo, array $user): void
{
    $state = (string) ($_GET['state'] ?? '');
    if (readSigned($state, time()) !== $user['id']) {
        returnToSettings('state');
    }
    $code = (string) ($_GET['code'] ?? '');
    if ($code === '') {
        returnToSettings((string) ($_GET['error'] ?? 'denied'));
    }
    saveTokens($pdo, $user['id'], exchangeCode($code));
    returnToSettings('');
}

/**
 * Trades the one-time code for the tokens.
 *
 * @return array<string, mixed>
 */
function exchangeCode(string $code): array
{
    $google = googleConfig();
    return postToGoogle([
        'code' => $code,
        'client_id' => (string) $google['client_id'],
        'client_secret' => (string) $google['client_secret'],
        'redirect_uri' => (string) $google['redirect_uri'],
        'grant_type' => 'authorization_code',
    ]);
}

/** Writes the tokens away, replacing an earlier connection of the same user. */
function saveTokens(PDO $pdo, string $userId, array $token): void
{
    $stmt = $pdo->prepare(
        'REPLACE INTO join_google_accounts
         (user_id, email, calendar_id, access_token, refresh_token, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute(tokenRow($userId, $token));
}

/**
 * The row as it goes into the table, tokens already sealed.
 *
 * @return list<string>
 */
function tokenRow(string $userId, array $token): array
{
    return [
        $userId,
        emailFromToken((string) ($token['id_token'] ?? '')),
        'primary',
        seal((string) ($token['access_token'] ?? '')),
        seal((string) ($token['refresh_token'] ?? '')),
        date('Y-m-d H:i:s', time() + (int) ($token['expires_in'] ?? 3600)),
    ];
}

/**
 * Reads the address out of the identity token. It is only shown back to the
 * owner, so the signature does not have to be checked: the token came
 * straight from Google over a verified connection.
 */
function emailFromToken(string $idToken): string
{
    $parts = explode('.', $idToken);
    if (count($parts) !== 3) {
        return '';
    }
    $claims = json_decode((string) base64_decode(strtr($parts[1], '-_', '+/')), true);
    return is_array($claims) ? (string) ($claims['email'] ?? '') : '';
}

/** Forgets the connection. The sealed tokens go with it. */
function disconnectCalendar(PDO $pdo, array $user): void
{
    $pdo->prepare('DELETE FROM join_google_accounts WHERE user_id = ?')->execute([$user['id']]);
    respond(200, ['ok' => true]);
}

/** Sends the browser back to the settings, with a note when it went wrong. */
function returnToSettings(string $problem): void
{
    $query = $problem === '' ? '?calendar=connected' : '?calendar=' . rawurlencode($problem);
    header('Location: ' . J0IN_RETURN_PATH . $query);
    exit;
}

/**
 * Posts a form to Google's token endpoint and returns the decoded answer.
 *
 * @param array<string, string> $form
 * @return array<string, mixed>
 */
function postToGoogle(array $form): array
{
    $curl = curl_init(J0IN_GOOGLE_TOKEN);
    curl_setopt_array($curl, postOptions($form));
    $body = (string) curl_exec($curl);
    $failed = curl_errno($curl) !== 0 || curl_getinfo($curl, CURLINFO_RESPONSE_CODE) >= 400;
    curl_close($curl);
    if ($failed) {
        fail(502, 'calendar.google_refused');
    }
    return decodeToken($body);
}

/**
 * The curl options for a form post.
 *
 * @param array<string, string> $form
 * @return array<int, mixed>
 */
function postOptions(array $form): array
{
    return [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($form),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
    ];
}

/**
 * Turns Google's answer into an array, refusing anything else.
 *
 * @return array<string, mixed>
 */
function decodeToken(string $body): array
{
    $token = json_decode($body, true);
    if (!is_array($token) || ($token['access_token'] ?? '') === '') {
        fail(502, 'calendar.google_refused');
    }
    return $token;
}
