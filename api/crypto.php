<?php

// Sealing for the few values that must survive in the database without being
// readable there: the Google tokens. Everything else is either hashed or
// harmless in plain text.

/** Seals a value. The nonce travels with it, so each result differs. */
function seal(string $plain): string
{
    $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
    return base64_encode($nonce . sodium_crypto_secretbox($plain, $nonce, secretKey()));
}

/** Opens a sealed value. Throws when the key no longer fits the data. */
function unseal(string $sealed): string
{
    $raw = base64_decode($sealed, true);
    $head = SODIUM_CRYPTO_SECRETBOX_NONCEBYTES;
    if ($raw === false || strlen($raw) <= $head) {
        throw new RuntimeException('sealed value is damaged');
    }
    $plain = sodium_crypto_secretbox_open(substr($raw, $head), substr($raw, 0, $head), secretKey());
    if ($plain === false) {
        throw new RuntimeException('sealed value does not open');
    }
    return $plain;
}

/** Signs a short-lived value, so it can be handed out and trusted on return. */
function signValue(string $value, int $until): string
{
    $body = $value . '.' . $until;
    return $body . '.' . hash_hmac('sha256', $body, secretKey());
}

/**
 * Reads a signed value back, or null when it was tampered with or has aged.
 * The comparison is timing safe on purpose.
 */
function readSigned(string $signed, int $now): ?string
{
    $parts = explode('.', $signed);
    if (count($parts) !== 3) {
        return null;
    }
    [$value, $until, $mac] = $parts;
    $wanted = hash_hmac('sha256', $value . '.' . $until, secretKey());
    return hash_equals($wanted, $mac) && (int) $until > $now ? $value : null;
}

/** Whether sealing is possible at all on this server. */
function sealingReady(): bool
{
    return extension_loaded('sodium') && configuredKey() !== '';
}

/** The key from config.php as raw bytes. */
function secretKey(): string
{
    $hex = configuredKey();
    if (strlen($hex) !== 64 || !ctype_xdigit($hex)) {
        throw new RuntimeException('secret_key is missing or not 64 hex characters');
    }
    return (string) hex2bin($hex);
}

/** The key as it stands in config.php, empty when it was never filled in. */
function configuredKey(): string
{
    static $key = null;
    if ($key === null) {
        $key = (string) (readConfig()['secret_key'] ?? '');
    }
    return $key;
}
