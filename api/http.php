<?php

/**
 * Sends a JSON response and ends the request.
 *
 * @param int   $status HTTP status code
 * @param mixed $body   anything json_encode can handle
 */
function respond(int $status, $body): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Sends an error response with a single message. */
function fail(int $status, string $message): void
{
    respond($status, ['error' => $message]);
}

/**
 * Reads and decodes the JSON request body.
 *
 * @return array<string, mixed>
 */
function jsonBody(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/**
 * Returns the path segments after /api/, e.g. ["auth", "login"].
 *
 * @return list<string>
 */
function segments(): array
{
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
    $path = preg_replace('#^.*/api/?#', '', $path);
    return array_values(array_filter(explode('/', trim($path, '/')), 'strlen'));
}

/** Reads a trimmed string field from the request body. */
function bodyString(array $body, string $key): string
{
    return is_string($body[$key] ?? null) ? trim($body[$key]) : '';
}

/** The caller's IP address, used for the login rate limit. */
function clientIp(): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    return substr($ip, 0, 45);
}
