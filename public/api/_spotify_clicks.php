<?php

/**
 * BTS Echo — Spotify clicks helpers (shared)
 *
 * WHY:
 * - spotify-click.php and spotify-clicks-top-weekly.php both needed the same table bootstrap.
 * - Keeping it in one place reduces duplication and avoids schema drift between endpoints.
 */

declare(strict_types=1);

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
