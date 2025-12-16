<?php
// Archivo: public/api/debug-auth.php — Propósito: diagnóstico de autenticación (cookies/sesión vs token) para depurar problemas en navegador.
require_once __DIR__ . '/_api.php';
api_bootstrap(true);

api_require_method('GET');

// NOTE: Do not echo raw secrets/tokens. Only return minimal metadata.

$sessionActive = session_status() === PHP_SESSION_ACTIVE;
$sessionId = $sessionActive ? session_id() : null;

$cookieHeader = $_SERVER['HTTP_COOKIE'] ?? null;
$hasCookieHeader = is_string($cookieHeader) && trim($cookieHeader) !== '';

$phpsessidCookie = $_COOKIE['PHPSESSID'] ?? null;
$hasPhpSessIdCookie = is_string($phpsessidCookie) && $phpsessidCookie !== '';

$authHeader = api_get_header('Authorization');
$hasAuthHeader = is_string($authHeader) && $authHeader !== '';

$bearerToken = api_get_bearer_token();
$tokenLen = $bearerToken ? strlen($bearerToken) : 0;
$tokenPreview = $bearerToken ? (substr($bearerToken, 0, 18) . '…') : null;

$tokenUserId = api_verify_token($bearerToken);

$sessionUserId = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;
$effectiveUserId = api_optional_user_id();

api_ok([
  'now' => date('c'),
  'request' => [
    'method' => $_SERVER['REQUEST_METHOD'] ?? null,
    'host' => $_SERVER['HTTP_HOST'] ?? null,
    'origin' => $_SERVER['HTTP_ORIGIN'] ?? null,
    'referer' => $_SERVER['HTTP_REFERER'] ?? null,
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
  ],
  'cookies' => [
    'has_cookie_header' => $hasCookieHeader,
    'has_phpsessid_cookie' => $hasPhpSessIdCookie,
  ],
  'session' => [
    'active' => $sessionActive,
    'id_present' => $sessionId ? true : false,
    'user_id' => $sessionUserId,
  ],
  'auth_header' => [
    'present' => $hasAuthHeader,
    'bearer_present' => $bearerToken ? true : false,
    'bearer_len' => $tokenLen,
    'bearer_preview' => $tokenPreview,
    'token_user_id' => $tokenUserId,
  ],
  'effective_user_id' => $effectiveUserId,
]);
