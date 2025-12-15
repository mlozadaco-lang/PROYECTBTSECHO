<?php
header('Content-Type: application/json; charset=utf-8');
session_start();

require_once __DIR__ . '/../../config/database.php';

function ensure_portal_spotify_clicks_table(PDO $pdo): void {
  $sql = "
    CREATE TABLE IF NOT EXISTS portal_spotify_clicks (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      spotify_url VARCHAR(255) NOT NULL,
      spotify_track_id VARCHAR(64) NULL,
      track_name VARCHAR(200) NULL,
      artists VARCHAR(300) NULL,
      context VARCHAR(60) NULL,
      clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_portal_spotify_clicks_clicked_at (clicked_at),
      INDEX idx_portal_spotify_clicks_track_id (spotify_track_id),
      INDEX idx_portal_spotify_clicks_user_id (user_id)
    );
  ";
  $pdo->exec($sql);

  // If table existed from an older schema, add missing columns.
  $cols = $pdo->query("SHOW COLUMNS FROM portal_spotify_clicks")->fetchAll(PDO::FETCH_ASSOC);
  $names = [];
  foreach ($cols as $c) {
    if (isset($c['Field'])) $names[strtolower((string)$c['Field'])] = true;
  }
  if (!isset($names['context'])) {
    $pdo->exec("ALTER TABLE portal_spotify_clicks ADD COLUMN context VARCHAR(60) NULL");
  }
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
  http_response_code(405);
  echo json_encode([
    'success' => false,
    'message' => 'Usa POST (application/json) para registrar el clic.'
  ]);
  exit;
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
  http_response_code(400);
  $debug = getenv('APP_DEBUG') === '1' ? [
    'debug' => [
      'content_type' => $_SERVER['CONTENT_TYPE'] ?? null,
      'content_length' => $_SERVER['CONTENT_LENGTH'] ?? null,
      'raw_len' => is_string($raw) ? strlen($raw) : null,
      'raw_preview' => is_string($raw) ? substr($raw, 0, 200) : null,
    ]
  ] : [];

  echo json_encode(['success' => false, 'message' => 'Body inválido'] + $debug);
  exit;
}

$spotifyUrl = trim((string)($data['spotify_url'] ?? ''));
$spotifyTrackId = trim((string)($data['spotify_track_id'] ?? ''));
$trackName = trim((string)($data['track_name'] ?? ''));
$artists = trim((string)($data['artists'] ?? ''));
$context = trim((string)($data['context'] ?? ''));

if (!$spotifyUrl) {
  http_response_code(400);
  echo json_encode(['success' => false, 'message' => 'spotify_url requerido']);
  exit;
}

// Basic allowlist: accept Spotify URLs only
$lower = strtolower($spotifyUrl);
if (!str_starts_with($lower, 'https://open.spotify.com/') && !str_starts_with($lower, 'http://open.spotify.com/')) {
  http_response_code(400);
  echo json_encode(['success' => false, 'message' => 'URL no permitida']);
  exit;
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

  echo json_encode(['success' => true]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => 'Error interno del servidor']);
}
