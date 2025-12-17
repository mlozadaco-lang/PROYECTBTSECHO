<!-- Archivo: docs/relaciones-bd.md — Propósito: documentar relaciones (FK) entre tablas de btsecho y su intención (core vs proyección). -->
# Relaciones de Base de Datos (btsecho)

Este documento lista **todas las relaciones reales** (foreign keys) existentes en la base de datos `btsecho` y cómo se conectan.

> Nota: varias tablas existen como “proyección futura” (catálogo musical, narrativa, coleccionables). El portal actual usa principalmente auth, misiones, progreso, reset y tracking.

## Diagrama (Mermaid ER)

Si tu visor de Markdown soporta Mermaid, este bloque dibuja el ERD:

```mermaid
erDiagram
  users {
    INT id PK
  }

  user_progress {
    INT user_id PK, FK
  }

  password_resets {
    INT id PK
    INT user_id FK
  }

  missions {
    INT id PK
  }

  user_missions {
    INT user_id PK, FK
    INT mission_id PK, FK
  }

  portal_spotify_clicks {
    BIGINT id PK
    INT user_id FK
  }

  roles {
    INT id PK
  }

  user_roles {
    INT user_id PK, FK
    INT role_id PK, FK
  }

  artists {
    INT id PK
  }

  albums {
    INT id PK
    INT artist_id FK
  }

  songs {
    INT id PK
    INT artist_id FK
    INT album_id FK
  }

  playlists {
    INT id PK
    INT user_id FK
  }

  playlist_songs {
    INT playlist_id PK, FK
    INT song_id PK, FK
  }

  achievements {
    INT id PK
  }

  user_achievements {
    INT user_id PK, FK
    INT achievement_id PK, FK
  }

  collectibles {
    INT id PK
  }

  user_collectibles {
    INT user_id PK, FK
    INT collectible_id PK, FK
  }

  story_nodes {
    INT id PK
  }

  user_story_progress {
    INT user_id PK, FK
    INT story_node_id PK, FK
  }

  portal_tracks {
    INT id PK
  }

  portal_track_listens {
    BIGINT id PK
    INT track_id FK
    INT user_id FK
  }

  users ||--|| user_progress : "1 a 1"
  users ||--o{ password_resets : "1 a N"

  users ||--o{ playlists : "1 a N"
  playlists ||--o{ playlist_songs : "1 a N"
  songs ||--o{ playlist_songs : "1 a N"

  artists ||--o{ albums : "1 a N"
  artists ||--o{ songs : "1 a N"
  albums ||--o{ songs : "1 a N"

  users ||--o{ portal_spotify_clicks : "1 a N (nullable)"

  portal_tracks ||--o{ portal_track_listens : "1 a N"
  users ||--o{ portal_track_listens : "1 a N (nullable)"

  users ||--o{ user_roles : "1 a N"
  roles ||--o{ user_roles : "1 a N"

  users ||--o{ user_missions : "1 a N"
  missions ||--o{ user_missions : "1 a N"

  users ||--o{ user_achievements : "1 a N"
  achievements ||--o{ user_achievements : "1 a N"

  users ||--o{ user_collectibles : "1 a N"
  collectibles ||--o{ user_collectibles : "1 a N"

  users ||--o{ user_story_progress : "1 a N"
  story_nodes ||--o{ user_story_progress : "1 a N"
```

## Relación por tabla (FK)

### Base (auth)

- `users` (PK: `id`)
  - Referenciada por: `user_progress`, `password_resets`, `playlists`, `user_roles`, `user_missions`, `user_achievements`, `user_collectibles`, `portal_track_listens`, `portal_spotify_clicks`, `user_story_progress`.

- `user_progress` (PK/FK: `user_id`)
  - `user_progress.user_id → users.id`
  - Tipo: **1 a 1** (un usuario tiene una fila de progreso)

- `password_resets` (PK: `id`)
  - `password_resets.user_id → users.id`
  - Tipo: **1 a N** (un usuario puede pedir varios resets; se controla por `used` y `expires_at`)

### Misiones (gamificación actual)

- `missions` (PK: `id`)
- `user_missions` (PK compuesta: `user_id`, `mission_id`)
  - `user_missions.user_id → users.id`
  - `user_missions.mission_id → missions.id`
  - Tipo: **N a N** entre usuarios y misiones (con atributos extra como `status`, `proof`, `completed_at`)

### Tracking del portal

- `portal_spotify_clicks` (PK: `id`)
  - `portal_spotify_clicks.user_id → users.id` (**nullable**)
  - Tipo: **1 a N** desde usuario (pero permite clics anónimos con `user_id=NULL`)

- `portal_tracks` (PK: `id`)
- `portal_track_listens` (PK: `id`)
  - `portal_track_listens.track_id → portal_tracks.id`
  - `portal_track_listens.user_id → users.id` (**nullable**)
  - Tipo: `portal_tracks (1) → (N) portal_track_listens` y `users (1) → (N) portal_track_listens` (opcional)

### Roles

- `roles` (PK: `id`)
- `user_roles` (PK compuesta: `user_id`, `role_id`)
  - `user_roles.user_id → users.id`
  - `user_roles.role_id → roles.id`
  - Tipo: **N a N** usuarios ↔ roles

### Catálogo musical (proyección)

- `artists` (PK: `id`)
- `albums` (PK: `id`)
  - `albums.artist_id → artists.id` (artists 1 → N albums)
- `songs` (PK: `id`)
  - `songs.artist_id → artists.id` (artists 1 → N songs)
  - `songs.album_id → albums.id` (albums 1 → N songs)

### Playlists (proyección)

- `playlists` (PK: `id`)
  - `playlists.user_id → users.id` (users 1 → N playlists)
- `playlist_songs` (PK compuesta: `playlist_id`, `song_id`)
  - `playlist_songs.playlist_id → playlists.id`
  - `playlist_songs.song_id → songs.id`
  - Tipo: **N a N** playlists ↔ songs

### Logros y coleccionables (proyección)

- `achievements` (PK: `id`)
- `user_achievements` (PK compuesta: `user_id`, `achievement_id`)
  - `user_achievements.user_id → users.id`
  - `user_achievements.achievement_id → achievements.id`

- `collectibles` (PK: `id`)
- `user_collectibles` (PK compuesta: `user_id`, `collectible_id`)
  - `user_collectibles.user_id → users.id`
  - `user_collectibles.collectible_id → collectibles.id`

### Narrativa (proyección)

- `story_nodes` (PK: `id`)
- `user_story_progress` (PK compuesta: `user_id`, `story_node_id`)
  - `user_story_progress.user_id → users.id`
  - `user_story_progress.story_node_id → story_nodes.id`

## Qué tablas son “core” hoy

- Core usadas por el sitio actualmente:
  - `users`, `user_progress`, `missions`, `user_missions`, `password_resets`, `portal_spotify_clicks`
- Proyección / futuras (existen en schema pero no son críticas para el MVP):
  - `roles`, `user_roles`, `artists`, `albums`, `songs`, `playlists`, `playlist_songs`, `portal_tracks`, `portal_track_listens`, `achievements`, `user_achievements`, `collectibles`, `user_collectibles`, `story_nodes`, `user_story_progress`
