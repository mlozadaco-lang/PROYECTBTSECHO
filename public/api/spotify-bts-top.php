<?php
// Archivo: public/api/spotify-bts-top.php — Propósito: consultar Spotify Web API (client_credentials) para obtener el Top actual de BTS.
require_once __DIR__ . '/_api.php';
api_bootstrap(true);

require_once __DIR__ . '/_db.php';

// WHY: centralize JSON header/session and consistent error responses.

api_require_method('GET');

require_once __DIR__ . '/spotify_helpers.php';

$cfg = spotify_get_env_config();
if (!$cfg['client_id'] || !$cfg['client_secret']) {
  api_json([
    'success' => false,
    'message' => 'Spotify no está configurado en el servidor (faltan credenciales).',
    'items' => [],
  ], 200);
}

$token = spotify_get_app_access_token_or_null();
if (!$token) {
  $debug = (getenv('APP_DEBUG') === '1');
  $tokenResp = $debug ? spotify_token_request(['grant_type' => 'client_credentials'], $cfg) : null;
  $status = $debug && is_array($tokenResp) ? (int)($tokenResp['status'] ?? 0) : null;
  $errJson = $debug && is_array($tokenResp) ? ($tokenResp['json'] ?? null) : null;

  api_json([
    'success' => false,
    'message' => 'No se pudo obtener token de Spotify (client_credentials).',
    'debug' => $debug ? [
      'token_status' => $status,
      'error' => is_array($errJson) ? ($errJson['error'] ?? null) : null,
      'error_description' => is_array($errJson) ? ($errJson['error_description'] ?? null) : null,
    ] : null,
    'items' => [],
  ], 502);
}

$limitRaw = (int)($_GET['limit'] ?? 10);
$limit = max(1, min(10, $limitRaw > 0 ? $limitRaw : 10)); // Spotify top-tracks returns up to 10

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
  api_fail(502, 'No se pudo obtener el Top BTS desde Spotify.', [
    'status' => $resp['status'] ?? 0,
    'items' => [],
  ]);
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

api_ok([
  'market' => $market,
  'items' => $items,
]);
