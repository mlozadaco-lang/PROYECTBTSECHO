-- =====================================================
-- BTS Echo — Cleanup de tablas no usadas (manual)
--
-- WARNING:
-- - Este script BORRA TABLAS y datos.
-- - Úsalo solo si confirmaste que estas features no se usan.
--
-- Objetivo:
-- - El proyecto actual usa: users, user_progress, missions, user_missions,
--   password_resets, portal_spotify_clicks.
-- - El resto son tablas "proyección" que hoy no tienen endpoints/uso en front.
-- =====================================================

USE btsecho;

SET FOREIGN_KEY_CHECKS = 0;

-- Narrativa (no usada)
DROP TABLE IF EXISTS user_story_progress;
DROP TABLE IF EXISTS story_nodes;

-- Coleccionables/logros (no usados)
DROP TABLE IF EXISTS user_collectibles;
DROP TABLE IF EXISTS collectibles;
DROP TABLE IF EXISTS user_achievements;
DROP TABLE IF EXISTS achievements;

-- Catálogo musical + playlists (no usados)
DROP TABLE IF EXISTS playlist_songs;
DROP TABLE IF EXISTS playlists;
DROP TABLE IF EXISTS songs;
DROP TABLE IF EXISTS albums;
DROP TABLE IF EXISTS artists;

-- Roles (no usados por el backend actual)
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS roles;

-- Tracking de escuchas locales (removido del código)
DROP TABLE IF EXISTS portal_track_listens;
DROP TABLE IF EXISTS portal_tracks;

SET FOREIGN_KEY_CHECKS = 1;
