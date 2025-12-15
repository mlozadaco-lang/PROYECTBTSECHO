<?php
require_once __DIR__ . '/_api.php';
api_bootstrap(true);

require_once __DIR__ . '/_spotify_clicks.php';

// WHY: share JSON/session boilerplate + shared table bootstrap between Spotify endpoints.

require_once __DIR__ . '/../../config/database.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
  api_fail(405, 'Usa POST (application/json) para registrar el clic.');
}

$raw = file_get_contents('php://input');
$data = null;

if (is_string($raw) && trim($raw) !== '') {
  $data = json_decode($raw, true);

  // Some clients may send form-encoded bodies; accept as fallback.
  if (!is_array($data)) {
    $tmp = [];
    parse_str($raw, $tmp);
    if (is_array($tmp) && !empty($tmp)) {
      $data = $tmp;
    }
  }
}

if (!is_array($data)) {
  $debug = getenv('APP_DEBUG') === '1' ? [
    'debug' => [
      'content_type' => $_SERVER['CONTENT_TYPE'] ?? null,
      'content_length' => $_SERVER['CONTENT_LENGTH'] ?? null,
      'raw_len' => is_string($raw) ? strlen($raw) : null,
      'raw_preview' => is_string($raw) ? substr($raw, 0, 200) : null,
    ]
  ] : [];

  api_fail(400, 'Body inválido', $debug);
}

$spotifyUrl = trim((string)($data['spotify_url'] ?? ''));
$spotifyTrackId = trim((string)($data['spotify_track_id'] ?? ''));
$trackName = trim((string)($data['track_name'] ?? ''));
$artists = trim((string)($data['artists'] ?? ''));
$context = trim((string)($data['context'] ?? ''));

if (!$spotifyUrl) {
  api_fail(400, 'spotify_url requerido');
}

// Basic allowlist: accept Spotify URLs only
$lower = strtolower($spotifyUrl);
if (!str_starts_with($lower, 'https://open.spotify.com/') && !str_starts_with($lower, 'http://open.spotify.com/')) {
  api_fail(400, 'URL no permitida');
}

// Extract track id from URL if missing
if (!$spotifyTrackId) {
  if (preg_match('~/track/([A-Za-z0-9]+)~', $spotifyUrl, $m)) {
    $spotifyTrackId = $m[1];
  }
}

if ($context && strlen($context) > 60) {
  $context = substr($context, 0, 60);
}

$userId = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;

try {
  ensure_portal_spotify_clicks_table($pdo);
  $stmt = $pdo->prepare(
    'INSERT INTO portal_spotify_clicks (user_id, spotify_url, spotify_track_id, track_name, artists, context)
     VALUES (?, ?, ?, ?, ?, ?)'
  );

  $stmt->execute([
    $userId,
    $spotifyUrl,
    $spotifyTrackId ?: null,
    $trackName ?: null,
    $artists ?: null,
    $context ?: null,
  ]);

  api_ok();
} catch (Exception $e) {
  api_fail(500, 'Error interno del servidor');
}
