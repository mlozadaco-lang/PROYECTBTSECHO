CREATE DATABASE IF NOT EXISTS btsecho;
USE btsecho;

-- =========================
-- USUARIOS Y ROLES
-- =========================

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- =========================
-- ARTISTAS, ALBUMES, CANCIONES
-- =========================

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
  album_id INT,
  artist_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  duration_seconds INT,
  FOREIGN KEY (album_id) REFERENCES albums(id),
  FOREIGN KEY (artist_id) REFERENCES artists(id)
);

-- =========================
-- PLAYLISTS
-- =========================

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
