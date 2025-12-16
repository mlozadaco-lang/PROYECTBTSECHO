<?php
// Archivo: public/api/_api.php — Propósito: helpers compartidos para APIs (bootstrap JSON/sesión, parse body, respuestas api_ok/api_fail, enforcement de método).

/**
 * BTS Echo — API helpers (shared)
 *
 * WHY:
 * - Most endpoints repeated the same boilerplate: JSON headers, session_start, reading JSON body,
 *   and emitting error responses.
 * - Centralizing that logic keeps endpoints shorter and easier to read, while keeping responses consistent.
 */

declare(strict_types=1);

function api_get_header(string $name): ?string {
  $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
  $val = $_SERVER[$key] ?? null;
  if (is_string($val) && $val !== '') return $val;

  // Some stacks put Authorization here.
  if (strcasecmp($name, 'Authorization') === 0) {
    $val2 = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
    if (is_string($val2) && $val2 !== '') return $val2;
  }

  if (function_exists('getallheaders')) {
    $h = getallheaders();
    if (is_array($h)) {
      foreach ($h as $k => $v) {
        if (is_string($k) && strcasecmp($k, $name) === 0) {
          return is_string($v) && $v !== '' ? $v : null;
        }
      }
    }
  }

  return null;
}

function api_b64url_encode(string $raw): string {
  return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
}

function api_b64url_decode(string $b64): string {
  $b64 = strtr($b64, '-_', '+/');
  $pad = strlen($b64) % 4;
  if ($pad) $b64 .= str_repeat('=', 4 - $pad);
  $out = base64_decode($b64, true);
  return is_string($out) ? $out : '';
}

function api_auth_secret(): string {
  // Use an env var when available (recommended in docker-compose .env).
  $s = getenv('BTSECHO_AUTH_SECRET');
  if (is_string($s) && $s !== '') return $s;
  // Fallback for local dev if user didn't set it.
  return 'btsecho-dev-secret-change-me';
}

function api_token_sign(string $payloadB64): string {
  return api_b64url_encode(hash_hmac('sha256', $payloadB64, api_auth_secret(), true));
}

function api_issue_token(int $userId, int $ttlSeconds = 86400): array {
  $exp = time() + max(60, $ttlSeconds);
  $payload = json_encode(['uid' => $userId, 'exp' => $exp], JSON_UNESCAPED_SLASHES);
  $payloadB64 = api_b64url_encode($payload ?: '{}');
  $sigB64 = api_token_sign($payloadB64);
  return [
    'token' => $payloadB64 . '.' . $sigB64,
    'exp' => $exp,
  ];
}

function api_get_bearer_token(): ?string {
  $auth = api_get_header('Authorization');
  if (!$auth) return null;
  if (preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) {
    $t = trim($m[1]);
    return $t !== '' ? $t : null;
  }
  return null;
}

function api_verify_token(?string $token): ?int {
  if (!$token) return null;
  $parts = explode('.', $token);
  if (count($parts) !== 2) return null;
  [$payloadB64, $sigB64] = $parts;
  if ($payloadB64 === '' || $sigB64 === '') return null;

  $wantSig = api_token_sign($payloadB64);
  if (!hash_equals($wantSig, $sigB64)) return null;

  $payloadJson = api_b64url_decode($payloadB64);
  $payload = json_decode($payloadJson, true);
  if (!is_array($payload)) return null;

  $uid = isset($payload['uid']) ? (int)$payload['uid'] : 0;
  $exp = isset($payload['exp']) ? (int)$payload['exp'] : 0;
  if ($uid <= 0 || $exp <= 0) return null;
  if (time() > $exp) return null;
  return $uid;
}

function api_bootstrap(bool $startSession = true): void {
  header('Content-Type: application/json; charset=utf-8');
  // Evita que el navegador cachee respuestas JSON (p.ej. /api/session.php),
  // porque puede hacer que el UI no refleje el login/logout inmediatamente.
  header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
  header('Pragma: no-cache');
  header('Expires: 0');

  if ($startSession && session_status() !== PHP_SESSION_ACTIVE) {
    // WHY: Explicit cookie params avoid edge cases where browsers treat missing SameSite as restrictive.
    // This is particularly important when working with localhost during development.
    if (PHP_VERSION_ID >= 70300) {
      session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => false,
        'httponly' => true,
        'samesite' => 'Lax',
      ]);
    } else {
      // Best-effort for older PHP versions.
      session_set_cookie_params(0, '/');
    }
    session_start();
  }
}

function api_json(array $payload, int $statusCode = 200): void {
  http_response_code($statusCode);
  echo json_encode($payload);
  exit;
}

function api_fail(int $statusCode, string $message, array $extra = []): void {
  api_json(array_merge(['success' => false, 'message' => $message], $extra), $statusCode);
}

function api_ok(array $payload = [], int $statusCode = 200): void {
  api_json(array_merge(['success' => true], $payload), $statusCode);
}

function api_read_json_body(): array {
  $raw = api_read_raw_body();
  return api_parse_body($raw, false);
}

function api_require_login(string $message = 'Debes iniciar sesión.'): int {
  $uid = api_optional_user_id();
  if (!$uid) api_fail(401, $message);
  return $uid;
}

function api_optional_user_id(): ?int {
  if (isset($_SESSION['user_id'])) return (int)$_SESSION['user_id'];
  $uid = api_verify_token(api_get_bearer_token());
  return $uid ?: null;
}

function api_read_raw_body(): string {
  $raw = file_get_contents('php://input');
  return is_string($raw) ? $raw : '';
}

function api_parse_body(string $raw, bool $allowFormEncoded = false): array {
  $raw = trim($raw);
  if ($raw === '') return [];

  $data = json_decode($raw, true);
  if (is_array($data)) return $data;

  if ($allowFormEncoded) {
    $tmp = [];
    parse_str($raw, $tmp);
    if (is_array($tmp) && !empty($tmp)) return $tmp;
  }

  // WHY: keep endpoints robust if body is empty or invalid JSON.
  return [];
}

function api_require_method(string $method, string $message = 'Método no permitido'): void {
  $want = strtoupper($method);
  $got = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

  if ($got !== $want) {
    api_fail(405, $message);
  }
}
