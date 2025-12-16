<?php

// Archivo: config/spotify.example.php — Propósito: plantilla de credenciales Spotify (ejemplo sin secretos).

// Example Spotify configuration.
// Copy to config/spotify.php (which should be gitignored) OR set env vars.
//
// Required for:
// - BTS global top (no login): client_id, client_secret

return [
  'client_id' => getenv('SPOTIFY_CLIENT_ID') ?: '',
  'client_secret' => getenv('SPOTIFY_CLIENT_SECRET') ?: '',
];
