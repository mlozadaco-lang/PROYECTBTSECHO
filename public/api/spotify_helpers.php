<?php
// Archivo: public/api/spotify_helpers.php — Propósito: helpers para Spotify (config, token client_credentials, HTTP requests) usados por spotify-bts-top.php.

// Helpers for Spotify Web API (client_credentials only).
// OAuth endpoints were removed because Spotify requires HTTPS Redirect URIs.

function spotify_trim_unquote(string $value): string {
  $value = trim($value);
  if (strlen($value) < 2) return $value;

  $first = $value[0];
  $last = $value[strlen($value) - 1];
  if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
    return substr($value, 1, -1);
  }
  return $value;
}

function spotify_get_env_config(): array {
  $clientId = (string)(getenv('SPOTIFY_CLIENT_ID') ?: '');
  $clientSecret = (string)(getenv('SPOTIFY_CLIENT_SECRET') ?: '');

  // Optional file-based config (similar to config/mail.php)
  $cfgFile = __DIR__ . '/../../config/spotify.php';
  if (is_file($cfgFile)) {
    $fromFile = require $cfgFile;
    if (is_array($fromFile)) {
      if (!$clientId && !empty($fromFile['client_id'])) $clientId = (string)$fromFile['client_id'];
      if (!$clientSecret && !empty($fromFile['client_secret'])) $clientSecret = (string)$fromFile['client_secret'];
    }
  }

  // Some environments wrap values in quotes; remove a single pair if present.
  $clientId = spotify_trim_unquote($clientId);
  $clientSecret = spotify_trim_unquote($clientSecret);

  return [
    'client_id' => $clientId,
    'client_secret' => $clientSecret,
  ];
}

function spotify_http_request(string $method, string $url, array $headers = [], ?string $body = null): array {
  $method = strtoupper($method);
  $timeout = 20;

  // Prefer cURL if available.
  if (function_exists('curl_init')) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);

    if (!empty($headers)) {
      curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }

    if ($body !== null) {
      curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }

    $resp = curl_exec($ch);
    $err = curl_error($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $headerSize = (int)curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    curl_close($ch);

    if ($resp === false) {
      return ['status' => 0, 'headers' => '', 'body' => '', 'error' => $err ?: 'cURL error'];
    }

    $rawHeaders = substr($resp, 0, $headerSize);
    $respBody = substr($resp, $headerSize);

    return ['status' => $status, 'headers' => $rawHeaders, 'body' => $respBody, 'error' => null];
  }

  // Fallback: stream context.
  $headerString = !empty($headers) ? implode("\r\n", $headers) : '';

  $opts = [
    'http' => [
      'method' => $method,
      'ignore_errors' => true,
      'header' => $headerString,
      'timeout' => $timeout,
    ],
  ];
  if ($body !== null) {
    $opts['http']['content'] = $body;
  }

  $context = stream_context_create($opts);
  $respBody = @file_get_contents($url, false, $context);
  $respHeaders = $http_response_header ?? [];

  $status = 0;
  if (is_array($respHeaders) && isset($respHeaders[0]) && preg_match('/\s(\d{3})\s/', (string)$respHeaders[0], $m)) {
    $status = (int)$m[1];
  }

  return [
    'status' => $status,
    'headers' => is_array($respHeaders) ? implode("\n", $respHeaders) : '',
    'body' => ($respBody !== false && $respBody !== null) ? $respBody : '',
    'error' => ($respBody === false || $respBody === null) ? 'HTTP request failed' : null,
  ];
}

function spotify_token_request(array $params, array $cfg): array {
  $auth = base64_encode((string)$cfg['client_id'] . ':' . (string)$cfg['client_secret']);
  $body = http_build_query($params);

  $resp = spotify_http_request(
    'POST',
    'https://accounts.spotify.com/api/token',
    [
      'Authorization: Basic ' . $auth,
      'Content-Type: application/x-www-form-urlencoded',
      'Accept: application/json',
    ],
    $body
  );

  $json = json_decode($resp['body'] ?? '', true);
  return [
    'status' => $resp['status'] ?? 0,
    'json' => is_array($json) ? $json : null,
    'raw' => $resp,
  ];
}

function spotify_token_cache_path(): string {
  $env = getenv('BTSECHO_SPOTIFY_TOKEN_CACHE');
  if (is_string($env) && trim($env) !== '') return trim($env);
  $dir = sys_get_temp_dir();
  if (!is_string($dir) || trim($dir) === '') $dir = '/tmp';
  return rtrim($dir, '/\\') . DIRECTORY_SEPARATOR . 'btsecho_spotify_app_token.json';
}

function spotify_read_cached_app_token(): ?string {
  $path = spotify_token_cache_path();
  if (!is_file($path)) return null;

  $raw = @file_get_contents($path);
  if (!is_string($raw) || trim($raw) === '') return null;

  $data = json_decode($raw, true);
  if (!is_array($data)) return null;

  $token = isset($data['access_token']) ? (string)$data['access_token'] : '';
  $expiresAt = isset($data['expires_at']) ? (int)$data['expires_at'] : 0;

  if ($token === '' || $expiresAt <= 0) return null;
  if (time() >= $expiresAt) return null;
  return $token;
}

function spotify_write_cached_app_token(string $token, int $expiresAt): void {
  $path = spotify_token_cache_path();
  $tmp = $path . '.tmp';
  $payload = json_encode([
    'access_token' => $token,
    'expires_at' => $expiresAt,
    'cached_at' => time(),
  ], JSON_UNESCAPED_SLASHES);
  if (!is_string($payload)) return;

  $fp = @fopen($tmp, 'wb');
  if (!$fp) return;

  try {
    @flock($fp, LOCK_EX);
    @fwrite($fp, $payload);
  } finally {
    @fflush($fp);
    @fclose($fp);
  }

  @rename($tmp, $path);
}

function spotify_get_app_access_token_or_null(): ?string {
  // Token for server-to-server calls (client_credentials).
  // Prefer server-side file cache so it doesn't depend on browser cookies/sessions.
  $cached = spotify_read_cached_app_token();
  if ($cached) return $cached;

  // Fallback: cache per PHP session if available.
  if (isset($_SESSION['spotify_app_access_token'], $_SESSION['spotify_app_expires_at'])) {
    $expiresAt = (int)($_SESSION['spotify_app_expires_at'] ?? 0);
    if (time() < $expiresAt) {
      return (string)$_SESSION['spotify_app_access_token'];
    }
  }

  $cfg = spotify_get_env_config();
  if (empty($cfg['client_id']) || empty($cfg['client_secret'])) {
    return null;
  }

  $tokenResp = spotify_token_request(['grant_type' => 'client_credentials'], $cfg);
  if (($tokenResp['status'] ?? 0) !== 200 || !is_array($tokenResp['json'])) {
    return null;
  }

  $accessToken = $tokenResp['json']['access_token'] ?? null;
  $expiresIn = (int)($tokenResp['json']['expires_in'] ?? 0);
  if (!$accessToken || $expiresIn <= 0) {
    return null;
  }

  $expiresAt = time() + $expiresIn - 30;
  if (isset($_SESSION) && is_array($_SESSION)) {
    $_SESSION['spotify_app_access_token'] = $accessToken;
    $_SESSION['spotify_app_expires_at'] = $expiresAt;
  }
  spotify_write_cached_app_token((string)$accessToken, (int)$expiresAt);
  return $accessToken;
}
