-- ===============================
-- BASE DE DATOS BTS ECHO
-- Proyección Inicial Completa
-- ===============================

CREATE DATABASE IF NOT EXISTS btsecho;
USE btsecho;

-- ===============================
-- USUARIOS Y ROLES
-- ===============================

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PASSWORD RESET (RECUPERACIÓN DE CONTRASEÑA)
-- =====================================================

CREATE TABLE password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  reset_token VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_password_resets_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);


CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE user_roles (
  user_id INT,
  role_id INT,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE user_progress (
  user_id INT PRIMARY KEY,
  level INT DEFAULT 1,
  experience INT DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ===============================
-- CATÁLOGO MUSICAL
-- ===============================

CREATE TABLE artists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  country VARCHAR(60)
);

CREATE TABLE albums (
  id INT AUTO_INCREMENT PRIMARY KEY,
  artist_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  release_date DATE,
  FOREIGN KEY (artist_id) REFERENCES artists(id)
);

CREATE TABLE songs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  artist_id INT NOT NULL,
  album_id INT,
  title VARCHAR(150) NOT NULL,
  duration_seconds INT,
  FOREIGN KEY (artist_id) REFERENCES artists(id),
  FOREIGN KEY (album_id) REFERENCES albums(id)
);

-- ===============================
-- PLAYLISTS
-- ===============================

CREATE TABLE playlists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE playlist_songs (
  playlist_id INT,
  song_id INT,
  PRIMARY KEY (playlist_id, song_id),
  FOREIGN KEY (playlist_id) REFERENCES playlists(id),
  FOREIGN KEY (song_id) REFERENCES songs(id)
);

-- ===============================
-- GAMIFICACIÓN
-- ===============================

CREATE TABLE missions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  reward_xp INT DEFAULT 0
);

CREATE TABLE user_missions (
  user_id INT,
  mission_id INT,
  status VARCHAR(30) DEFAULT 'pending',
  proof TEXT NULL,
  completed_at TIMESTAMP NULL,
  PRIMARY KEY (user_id, mission_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (mission_id) REFERENCES missions(id)
);

CREATE TABLE achievements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT
);

CREATE TABLE user_achievements (
  user_id INT,
  achievement_id INT,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, achievement_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (achievement_id) REFERENCES achievements(id)
);

CREATE TABLE collectibles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  type VARCHAR(50),
  rarity VARCHAR(30)
);

CREATE TABLE user_collectibles (
  user_id INT,
  collectible_id INT,
  acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, collectible_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (collectible_id) REFERENCES collectibles(id)
);

-- ===============================
-- NARRATIVA INTERACTIVA
-- ===============================

CREATE TABLE story_nodes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150),
  narrative_text TEXT
);

CREATE TABLE user_story_progress (
  user_id INT,
  story_node_id INT,
  choice_taken VARCHAR(100),
  PRIMARY KEY (user_id, story_node_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (story_node_id) REFERENCES story_nodes(id)
);

-- ===============================
-- MÚSICA (PORTAL) — TRACKING
-- Guarda escuchas del reproductor local para poder calcular un TOP semanal
-- ===============================

CREATE TABLE portal_tracks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_index INT NOT NULL UNIQUE,
  member_name VARCHAR(100) NOT NULL,
  track_title VARCHAR(150) NOT NULL,
  mp3_path VARCHAR(255) NOT NULL,
  spotify_url VARCHAR(255) NULL
);

CREATE TABLE portal_track_listens (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  track_id INT NOT NULL,
  user_id INT NULL,
  seconds_listened INT NOT NULL DEFAULT 0,
  played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (track_id) REFERENCES portal_tracks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_portal_track_listens_played_at (played_at),
  INDEX idx_portal_track_listens_track_id (track_id),
  INDEX idx_portal_track_listens_user_id (user_id)
);

-- ===============================
-- SPOTIFY (PORTAL) — CLICK TRACKING
-- Guarda clics a enlaces de Spotify dentro del sitio, para un Top semanal por clics.
-- ===============================

CREATE TABLE portal_spotify_clicks (
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

-- ===============================
-- DATOS BASE INICIALES
-- ===============================

INSERT INTO roles (name) VALUES ('ADMIN'), ('USER');

INSERT INTO artists (name, country)
VALUES ('BTS', 'Corea del Sur');

-- ===============================
-- MISIONES (DATOS DE EJEMPLO)
-- ===============================

INSERT INTO missions (title, description, reward_xp) VALUES
('Activa Army Mode', 'Activa el modo Army en el portal (toggle de tema).', 10),
('Mensaje ARMY', 'Envía un mensaje positivo a la comunidad.', 5),
('Entrega de recuerdos', 'Comparte un recuerdo especial de BTS.', 8);

-- ===============================
-- TRACKS DEL PORTAL (vinculados a public/assets/js/members.js)
-- member_index debe coincidir con el índice del array members[]
-- ===============================

INSERT INTO portal_tracks (member_index, member_name, track_title, mp3_path, spotify_url) VALUES
(0, 'Jungkook', 'Seven', 'assets/audio/Jk.mp3', 'https://open.spotify.com/track/2HRgqmZQC0MC7GeNuDIXHN'),
(1, 'Suga', 'Seesaw', 'assets/audio/Suga.mp3', 'https://open.spotify.com/track/0mZI1NpihIVcho2f9MmqSW'),
(2, 'Jin', 'Don''t Say You Love Me', 'assets/audio/Jin.mp3', 'https://open.spotify.com/track/27xkOIER6uDLKALIelHylZ'),
(3, 'V', 'Slow Dancing', 'assets/audio/V.mp3', 'https://open.spotify.com/track/5h1BN75CEh8wdSwE1xrbSe'),
(4, 'Jimin', 'Who', 'assets/audio/Jimin.mp3', 'https://open.spotify.com/track/7tI8dRuH2Yc6RuoTjxo4dU'),
(5, 'RM', 'Lonely', 'assets/audio/RM.mp3', 'https://open.spotify.com/track/49iPCmLYg3SS8r2MXcbR1N'),
(6, 'J-Hope', 'Killin'' It Girl', 'assets/audio/Jhope.mp3', 'https://open.spotify.com/track/32SrQzg34vQiYjyzjg3wum');
