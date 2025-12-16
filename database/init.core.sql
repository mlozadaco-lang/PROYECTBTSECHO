-- ===============================
-- BASE DE DATOS BTS ECHO — ESQUEMA CORE (MVP)
--
-- Crea solo lo que el código usa hoy (Auth, misiones, progreso, clicks Spotify).
-- Usar esto cuando quieras una instalación mínima.
-- ===============================

CREATE DATABASE IF NOT EXISTS btsecho;
USE btsecho;

-- ===============================
-- Auth / Usuarios
-- ===============================

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Password reset (recuperación de contraseña)
-- =====================================================

CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  reset_token VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_password_resets_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,
  INDEX idx_password_resets_token (reset_token),
  INDEX idx_password_resets_expires (expires_at)
);

-- ===============================
-- Progreso (niveles / XP)
-- ===============================

CREATE TABLE IF NOT EXISTS user_progress (
  user_id INT PRIMARY KEY,
  level INT DEFAULT 1,
  experience INT DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ===============================
-- Misiones (gamificación MVP)
-- ===============================

CREATE TABLE IF NOT EXISTS missions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  reward_xp INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_missions (
  user_id INT,
  mission_id INT,
  status VARCHAR(30) DEFAULT 'pending',
  proof TEXT NULL,
  completed_at TIMESTAMP NULL,
  PRIMARY KEY (user_id, mission_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (mission_id) REFERENCES missions(id)
);

-- ===============================
-- Spotify (portal) — click tracking
-- ===============================

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

-- ===============================
-- Datos iniciales (MVP)
-- ===============================

INSERT INTO missions (title, description, reward_xp) VALUES
('Activa Army Mode', 'Activa el modo Army en el portal (toggle de tema).', 10),
('Mensaje ARMY', 'Envía un mensaje positivo a la comunidad.', 5),
('Entrega de recuerdos', 'Comparte un recuerdo especial de BTS.', 8)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  reward_xp = VALUES(reward_xp);
