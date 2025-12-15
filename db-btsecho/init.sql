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
-- DATOS BASE INICIALES
-- ===============================

INSERT INTO roles (name) VALUES ('ADMIN'), ('USER');

INSERT INTO artists (name, country)
VALUES ('BTS', 'Corea del Sur');
