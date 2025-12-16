<?php
// Archivo: public/api/spotify-clicks-top-weekly.php — Propósito: devolver el ranking semanal (7 días) basado en clics almacenados en portal_spotify_clicks.
/**
 * Endpoint: GET /api/spotify-clicks-top-weekly.php
 *
 * Top semanal (últimos 7 días) basado en clics a enlaces de Spotify dentro del portal.
 * Agrega por todos los usuarios (y anónimos).
 */

require_once __DIR__ . '/_api.php';
api_bootstrap(false);

api_require_method('GET');

require_once __DIR__ . '/_spotify_clicks.php';

// WHY: keep endpoint small; share table bootstrap with spotify-click.php.

require_once __DIR__ . '/../../config/database.php';

$limitRaw = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
$limit = max(1, min(20, $limitRaw > 0 ? $limitRaw : 10));

try {
  ensure_portal_spotify_clicks_table($pdo);
  // Avoid a feedback loop: clicks on the "Top semanal (clics)" list should not count toward the ranking.
  $contextFilter = portal_spotify_clicks_has_column($pdo, 'context')
    ? " AND (context IS NULL OR context <> 'weekly_clicks')"
    : '';

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

  api_ok([
    'range_days' => 7,
    'items' => $items,
  ]);
} catch (Exception $e) {
  $msg = $e->getMessage();

  // Friendly hint if the table doesn't exist (common when DB volume already existed)
  $lower = strtolower($msg);
  $missingTable = str_contains($lower, 'portal_spotify_clicks')
    && (str_contains($lower, "doesn't exist") || str_contains($lower, 'base table') || str_contains($lower, 'not found'));

  $publicMessage = $missingTable
    ? 'Falta la tabla portal_spotify_clicks en la base de datos. Crea la tabla y vuelve a probar.'
    : 'Error interno del servidor';

  $debug = getenv('APP_DEBUG') === '1' ? ['debug' => $msg] : [];

  api_fail(500, $publicMessage, ['items' => []] + $debug);
}
