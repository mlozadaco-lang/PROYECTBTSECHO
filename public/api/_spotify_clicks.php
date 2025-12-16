<?php
// Archivo: public/api/_spotify_clicks.php — Propósito: helpers compartidos para asegurar/migrar la tabla portal_spotify_clicks (schema drift safe).

/**
 * BTS Echo — Spotify clicks helpers (shared)
 *
 * WHY:
 * - spotify-click.php and spotify-clicks-top-weekly.php both needed the same table bootstrap.
 * - Keeping it in one place reduces duplication and avoids schema drift between endpoints.
 */

declare(strict_types=1);

function portal_spotify_clicks_has_column(PDO $pdo, string $column): bool {
  $stmt = $pdo->prepare("SHOW COLUMNS FROM portal_spotify_clicks LIKE ?");
  $stmt->execute([$column]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  return is_array($row) && !empty($row);
}

function ensure_portal_spotify_clicks_table(PDO $pdo): void {
  $pdo->exec("
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
  ");

  // If table existed from an older schema, add missing columns.
  if (!portal_spotify_clicks_has_column($pdo, 'context')) {
    $pdo->exec("ALTER TABLE portal_spotify_clicks ADD COLUMN context VARCHAR(60) NULL");
  }
}
