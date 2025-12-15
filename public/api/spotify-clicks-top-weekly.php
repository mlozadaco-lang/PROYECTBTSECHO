<?php
/**
 * Endpoint: GET /api/spotify-clicks-top-weekly.php
 *
 * Top semanal (últimos 7 días) basado en clics a enlaces de Spotify dentro del portal.
 * Agrega por todos los usuarios (y anónimos).
 */

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

function portal_spotify_clicks_has_column(PDO $pdo, string $column): bool {
  $stmt = $pdo->prepare("SHOW COLUMNS FROM portal_spotify_clicks LIKE ?");
  $stmt->execute([$column]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  return is_array($row) && !empty($row);
}

$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
if ($limit <= 0) $limit = 10;
if ($limit > 20) $limit = 20;

try {
  ensure_portal_spotify_clicks_table($pdo);
  $hasContext = portal_spotify_clicks_has_column($pdo, 'context');
  // Avoid a feedback loop: clicks on the "Top semanal (clics)" list should not count toward the ranking.
  $contextFilter = $hasContext ? " AND (context IS NULL OR context <> 'weekly_clicks')" : '';

  $sql = "
    SELECT
      COALESCE(spotify_track_id, spotify_url) AS item_key,
      MAX(track_name) AS track_name,
      MAX(artists) AS artists,
      MAX(spotify_url) AS spotify_url,
      COUNT(id) AS clicks,
      COUNT(DISTINCT user_id) AS unique_users
    FROM portal_spotify_clicks
    WHERE clicked_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    $contextFilter
    GROUP BY COALESCE(spotify_track_id, spotify_url)
    ORDER BY clicks DESC
    LIMIT " . (int)$limit;

  $stmt = $pdo->query($sql);
  $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode([
    'success' => true,
    'range_days' => 7,
    'items' => $items,
  ]);
} catch (Exception $e) {
  http_response_code(500);
  $msg = $e->getMessage();

  // Friendly hint if the table doesn't exist (common when DB volume already existed)
  $lower = strtolower($msg);
  $missingTable = str_contains($lower, 'portal_spotify_clicks')
    && (str_contains($lower, "doesn't exist") || str_contains($lower, 'base table') || str_contains($lower, 'not found'));

  $publicMessage = $missingTable
    ? 'Falta la tabla portal_spotify_clicks en la base de datos. Crea la tabla y vuelve a probar.'
    : 'Error interno del servidor';

  $debug = getenv('APP_DEBUG') === '1' ? ['debug' => $msg] : [];

  echo json_encode([
    'success' => false,
    'message' => $publicMessage,
    'items' => [],
  ] + $debug);
}
