<?php
header('Content-Type: application/json; charset=utf-8');
session_start();

require_once __DIR__ . '/spotify_helpers.php';

$cfg = spotify_get_env_config();
if (!$cfg['client_id'] || !$cfg['client_secret']) {
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'message' => 'Spotify no está configurado en el servidor (faltan credenciales).',
    'items' => [],
  ]);
  exit;
}

$token = spotify_get_app_access_token_or_null();
if (!$token) {
  http_response_code(502);
  $debug = (getenv('APP_DEBUG') === '1');
  $cfg2 = spotify_get_env_config();
  $tokenResp = $debug ? spotify_token_request(['grant_type' => 'client_credentials'], $cfg2) : null;
  $status = $debug && is_array($tokenResp) ? (int)($tokenResp['status'] ?? 0) : null;
  $errJson = $debug && is_array($tokenResp) ? ($tokenResp['json'] ?? null) : null;
  echo json_encode([
    'success' => false,
    'message' => 'No se pudo obtener token de Spotify (client_credentials).',
    'debug' => $debug ? [
      'token_status' => $status,
      'error' => is_array($errJson) ? ($errJson['error'] ?? null) : null,
      'error_description' => is_array($errJson) ? ($errJson['error_description'] ?? null) : null,
    ] : null,
    'items' => [],
  ]);
  exit;
}

$limit = (int)($_GET['limit'] ?? 10);
if ($limit < 1) $limit = 10;
if ($limit > 10) $limit = 10; // Spotify top-tracks returns up to 10

$market = strtoupper(trim((string)($_GET['market'] ?? 'US')));
if (!preg_match('/^[A-Z]{2}$/', $market)) {
  $market = 'US';
}

// Official BTS artist id on Spotify
$btsArtistId = '3Nrfpe0tUJi4K4DXYWgMUX';

$url = 'https://api.spotify.com/v1/artists/' . rawurlencode($btsArtistId) . '/top-tracks?market=' . rawurlencode($market);

$resp = spotify_http_request('GET', $url, [
  'Authorization: Bearer ' . $token,
  'Accept: application/json',
]);

if (($resp['status'] ?? 0) !== 200) {
  http_response_code(502);
  echo json_encode([
    'success' => false,
    'message' => 'No se pudo obtener el Top BTS desde Spotify.',
    'status' => $resp['status'] ?? 0,
    'items' => [],
  ]);
  exit;
}

$data = json_decode($resp['body'] ?? '', true);
$tracks = is_array($data) ? ($data['tracks'] ?? []) : [];

$items = [];
foreach ($tracks as $track) {
  if (!is_array($track)) continue;

  $artists = [];
  foreach (($track['artists'] ?? []) as $a) {
    if (!empty($a['name'])) $artists[] = $a['name'];
  }

  $img = null;
  $images = $track['album']['images'] ?? [];
  if (is_array($images) && count($images) > 0) {
    $img = $images[0]['url'] ?? null;
  }

  $items[] = [
    'id' => $track['id'] ?? null,
    'name' => $track['name'] ?? null,
    'artists' => $artists,
    'album' => $track['album']['name'] ?? null,
    'image' => $img,
    'spotify_url' => $track['external_urls']['spotify'] ?? null,
    'preview_url' => $track['preview_url'] ?? null,
    'duration_ms' => $track['duration_ms'] ?? null,
  ];
}

if (count($items) > $limit) {
  $items = array_slice($items, 0, $limit);
}

echo json_encode([
  'success' => true,
  'market' => $market,
  'items' => $items,
]);
