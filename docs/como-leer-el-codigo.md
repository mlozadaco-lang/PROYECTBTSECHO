# Cómo leer el código (guía rápida)

Esta guía existe para que alguien nuevo del equipo pueda ubicarse en ~10 minutos.

## Mental model (muy corto)

- El **front** vive en `public/` (HTML/CSS/JS).
- El front llama a **APIs PHP** en `public/api/*.php`.
- Las APIs persisten en **MySQL** (Docker) y usan `config/database.php`.

## Puntos de entrada (front)

- Portal principal: `public/index.html`
  - Datos de miembros (cards + pistas locales): `public/assets/js/members.js`
  - Lógica principal de UI: `public/assets/js/script.js`
  - Reproductor superior (audio local): `public/assets/js/player.js`
  - Top semanal por clics Spotify: `public/assets/js/weekly-spotify-top.js`
  - Spotify (Top BTS + tracking de clics): `public/assets/js/spotify.js`
  - Auth (login/register/logout/session): `public/assets/js/auth.js`

## Helpers compartidos (lo más importante)

- JS: `public/assets/js/api.js`
  - Expone `window.BtsEchoApi` con `requestJson/postJson`.
  - Objetivo: no repetir `fetch + headers + parse JSON` en cada archivo.

- PHP: `public/api/_api.php`
  - Helpers de respuesta JSON consistentes: `api_ok/api_fail/api_json`.
  - `api_bootstrap()` centraliza header JSON y sesión.

## Spotify (cómo está armado)

- `GET /api/spotify-bts-top.php`
  - Spotify real sin login: usa `client_credentials`.

- `POST /api/spotify-click.php`
  - Registra clics a links de Spotify dentro del portal.

- `GET /api/spotify-clicks-top-weekly.php`
  - Ranking de últimos 7 días basado en clics.

- `public/api/_spotify_clicks.php`
  - Helper compartido para asegurar la tabla `portal_spotify_clicks`.

## Base de datos (lo mínimo)

- Inicialización: `database/init.sql`
- Tabla de clics Spotify: `portal_spotify_clicks`

## Regla práctica para cambios

- Si es UI/comportamiento en navegador: empieza por `public/index.html` y el JS correspondiente.
- Si es datos/estado: busca el endpoint en `public/api/` y su query SQL.
- Si ves fetch repetido: intenta pasar por `window.BtsEchoApi`.
