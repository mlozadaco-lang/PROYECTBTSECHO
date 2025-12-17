-- Archivo: database/sample-data.sql — Propósito: datos de ejemplo (INSERT) para TODAS las tablas del esquema btsecho.
--
-- Cómo usar (DB ya creada):
--   docker exec -i mysql_btsecho mysql -uadmin -padmin123 btsecho < database/sample-data.sql
--
-- Nota:
-- - Este script intenta ser “re-ejecutable” (no falla si ya existen algunos datos).
-- - Para los usuarios de ejemplo, la contraseña es: Password123!

USE btsecho;

START TRANSACTION;

/* =====================================================
   1) Roles
===================================================== */
INSERT INTO roles (name) VALUES ('ADMIN'), ('USER')
ON DUPLICATE KEY UPDATE name = VALUES(name);

SET @role_admin := (SELECT id FROM roles WHERE name='ADMIN' LIMIT 1);
SET @role_user  := (SELECT id FROM roles WHERE name='USER'  LIMIT 1);

/* =====================================================
   2) Users + progress
===================================================== */
SET @pwd_hash := '$2y$10$dQyfSFjA4n8uv.gmQNYW3O6rGxMr.1bIGir8SM6zdhM5KD8oCq2Vm';

INSERT INTO users (name, email, password_hash)
VALUES ('Cris', 'cristiangamboa474@gmail.com', @pwd_hash)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), name = VALUES(name), password_hash = VALUES(password_hash);
SET @user_cris := LAST_INSERT_ID();

INSERT INTO users (name, email, password_hash)
VALUES ('Demo User', 'demo@btsecho.local', @pwd_hash)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), name = VALUES(name), password_hash = VALUES(password_hash);
SET @user_demo := LAST_INSERT_ID();

INSERT INTO user_progress (user_id, level, experience)
VALUES
  (@user_cris, 2, 15),
  (@user_demo, 1, 0)
ON DUPLICATE KEY UPDATE level = VALUES(level), experience = VALUES(experience);

/* user_roles (N a N) */
INSERT IGNORE INTO user_roles (user_id, role_id) VALUES
  (@user_cris, @role_admin),
  (@user_cris, @role_user),
  (@user_demo, @role_user);

/* =====================================================
   3) Password reset
===================================================== */
INSERT INTO password_resets (user_id, reset_token, expires_at, used)
SELECT @user_demo, REPEAT('a', 64), DATE_ADD(NOW(), INTERVAL 30 MINUTE), 0
WHERE NOT EXISTS (
  SELECT 1 FROM password_resets
  WHERE user_id = @user_demo AND reset_token = REPEAT('a', 64)
);

/* =====================================================
   4) Missions + user_missions
===================================================== */
INSERT INTO missions (title, description, reward_xp)
SELECT 'Activa Army Mode', 'Activa el modo Army en el portal (toggle de tema).', 10
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE title='Activa Army Mode');

INSERT INTO missions (title, description, reward_xp)
SELECT 'Mensaje ARMY', 'Envía un mensaje positivo a la comunidad.', 5
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE title='Mensaje ARMY');

INSERT INTO missions (title, description, reward_xp)
SELECT 'Entrega de recuerdos', 'Comparte un recuerdo especial de BTS.', 8
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE title='Entrega de recuerdos');

SET @mission_army := (SELECT id FROM missions WHERE title='Activa Army Mode' LIMIT 1);
SET @mission_msg  := (SELECT id FROM missions WHERE title='Mensaje ARMY' LIMIT 1);
SET @mission_mem  := (SELECT id FROM missions WHERE title='Entrega de recuerdos' LIMIT 1);

INSERT IGNORE INTO user_missions (user_id, mission_id, status, proof, completed_at)
VALUES
  (@user_cris, @mission_army, 'completed', 'Activé Army Mode 💜', NOW()),
  (@user_cris, @mission_msg,  'pending',   NULL, NULL),
  (@user_demo, @mission_mem,  'pending',   NULL, NULL);

/* =====================================================
   5) Spotify click tracking (portal)
===================================================== */
INSERT INTO portal_spotify_clicks (user_id, spotify_url, spotify_track_id, track_name, artists, context)
VALUES
  (@user_cris, 'https://open.spotify.com/track/2HRgqmZQC0MC7GeNuDIXHN', '2HRgqmZQC0MC7GeNuDIXHN', 'Seven', 'Jungkook', 'bts_top'),
  (NULL,       'https://open.spotify.com/track/0mZI1NpihIVcho2f9MmqSW', '0mZI1NpihIVcho2f9MmqSW', 'Seesaw', 'SUGA',     'weekly_clicks');

/* =====================================================
   6) Portal tracks + listens
===================================================== */
INSERT INTO portal_tracks (member_index, member_name, track_title, mp3_path, spotify_url)
VALUES (99, 'Demo', 'Demo Track', 'assets/audio/demo.mp3', 'https://open.spotify.com/track/2HRgqmZQC0MC7GeNuDIXHN')
ON DUPLICATE KEY UPDATE
  member_name = VALUES(member_name),
  track_title = VALUES(track_title),
  mp3_path = VALUES(mp3_path),
  spotify_url = VALUES(spotify_url);

SET @portal_track_demo := (SELECT id FROM portal_tracks WHERE member_index=99 LIMIT 1);

INSERT INTO portal_track_listens (track_id, user_id, seconds_listened)
VALUES
  (@portal_track_demo, @user_cris, 42),
  (@portal_track_demo, NULL, 12);

/* =====================================================
   7) Catálogo musical (artists/albums/songs)
===================================================== */
INSERT INTO artists (name, country)
SELECT 'BTS', 'Corea del Sur'
WHERE NOT EXISTS (SELECT 1 FROM artists WHERE name='BTS');

INSERT INTO artists (name, country)
SELECT 'Agust D', 'Corea del Sur'
WHERE NOT EXISTS (SELECT 1 FROM artists WHERE name='Agust D');

SET @artist_bts := (SELECT id FROM artists WHERE name='BTS' LIMIT 1);
SET @artist_agustd := (SELECT id FROM artists WHERE name='Agust D' LIMIT 1);

INSERT INTO albums (artist_id, title, release_date)
SELECT @artist_bts, 'BTS Demo Album', '2020-01-01'
WHERE NOT EXISTS (
  SELECT 1 FROM albums WHERE artist_id=@artist_bts AND title='BTS Demo Album'
);

SET @album_bts_demo := (SELECT id FROM albums WHERE artist_id=@artist_bts AND title='BTS Demo Album' ORDER BY id ASC LIMIT 1);

INSERT INTO songs (artist_id, album_id, title, duration_seconds)
SELECT @artist_bts, @album_bts_demo, 'Demo Song 1', 210
WHERE NOT EXISTS (
  SELECT 1 FROM songs WHERE artist_id=@artist_bts AND album_id=@album_bts_demo AND title='Demo Song 1'
);

INSERT INTO songs (artist_id, album_id, title, duration_seconds)
SELECT @artist_bts, @album_bts_demo, 'Demo Song 2', 198
WHERE NOT EXISTS (
  SELECT 1 FROM songs WHERE artist_id=@artist_bts AND album_id=@album_bts_demo AND title='Demo Song 2'
);

INSERT INTO songs (artist_id, album_id, title, duration_seconds)
SELECT @artist_agustd, NULL, 'Agust D Demo Single', 185
WHERE NOT EXISTS (
  SELECT 1 FROM songs WHERE artist_id=@artist_agustd AND album_id IS NULL AND title='Agust D Demo Single'
);

SET @song_1 := (
  SELECT id FROM songs
  WHERE artist_id=@artist_bts AND album_id=@album_bts_demo AND title='Demo Song 1'
  ORDER BY id ASC
  LIMIT 1
);
SET @song_2 := (
  SELECT id FROM songs
  WHERE artist_id=@artist_bts AND album_id=@album_bts_demo AND title='Demo Song 2'
  ORDER BY id ASC
  LIMIT 1
);

/* =====================================================
   8) Playlists (users -> playlists -> playlist_songs -> songs)
===================================================== */
INSERT INTO playlists (user_id, name)
SELECT @user_cris, 'Favoritas (demo)'
WHERE NOT EXISTS (
  SELECT 1 FROM playlists WHERE user_id=@user_cris AND name='Favoritas (demo)'
);

SET @playlist_demo := (
  SELECT id FROM playlists WHERE user_id=@user_cris AND name='Favoritas (demo)'
  ORDER BY id ASC
  LIMIT 1
);

INSERT IGNORE INTO playlist_songs (playlist_id, song_id)
VALUES
  (@playlist_demo, @song_1),
  (@playlist_demo, @song_2);

/* =====================================================
   9) Achievements + user_achievements
===================================================== */
INSERT INTO achievements (name, description)
SELECT 'Primer Login', 'Se desbloquea al iniciar sesión por primera vez.'
WHERE NOT EXISTS (SELECT 1 FROM achievements WHERE name='Primer Login');

SET @ach_login := (SELECT id FROM achievements WHERE name='Primer Login' LIMIT 1);

INSERT IGNORE INTO user_achievements (user_id, achievement_id)
VALUES (@user_cris, @ach_login);

/* =====================================================
   10) Collectibles + user_collectibles
===================================================== */
INSERT INTO collectibles (name, type, rarity)
SELECT 'Photocard Demo', 'photocard', 'common'
WHERE NOT EXISTS (SELECT 1 FROM collectibles WHERE name='Photocard Demo');

SET @collect_demo := (SELECT id FROM collectibles WHERE name='Photocard Demo' LIMIT 1);

INSERT IGNORE INTO user_collectibles (user_id, collectible_id)
VALUES (@user_demo, @collect_demo);

/* =====================================================
   11) Narrativa (story_nodes + user_story_progress)
===================================================== */
INSERT INTO story_nodes (title, narrative_text)
SELECT 'Inicio', 'Bienvenido al EchoVerse.'
WHERE NOT EXISTS (SELECT 1 FROM story_nodes WHERE title='Inicio');

INSERT INTO story_nodes (title, narrative_text)
SELECT 'Decisión', '¿Qué camino tomas hoy?'
WHERE NOT EXISTS (SELECT 1 FROM story_nodes WHERE title='Decisión');

SET @story_1 := (SELECT id FROM story_nodes WHERE title='Inicio' ORDER BY id ASC LIMIT 1);
SET @story_2 := (SELECT id FROM story_nodes WHERE title='Decisión' ORDER BY id ASC LIMIT 1);

INSERT IGNORE INTO user_story_progress (user_id, story_node_id, choice_taken)
VALUES
  (@user_cris, @story_1, 'enter'),
  (@user_cris, @story_2, 'left');

COMMIT;
