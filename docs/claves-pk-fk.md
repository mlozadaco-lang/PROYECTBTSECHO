# Claves primarias (PK) y foráneas (FK) — BTSEcho (btsecho)

Este documento lista, por cada tabla, su **clave primaria (PK)** y sus **claves foráneas (FK)** (las “secundarias” en el sentido de relaciones).

Fuente: esquema en [database/init.sql](../database/init.sql)

---

## Tablas y claves

### users
- PK: `id`
- FK: (ninguna)

### password_resets
- PK: `id`
- FK:
  - `user_id` → `users.id` (ON DELETE CASCADE)

### roles
- PK: `id`
- FK: (ninguna)

### user_roles (tabla puente N–N)
- PK (compuesta): (`user_id`, `role_id`)
- FK:
  - `user_id` → `users.id`
  - `role_id` → `roles.id`

### user_progress
- PK: `user_id`
- FK:
  - `user_id` → `users.id`

---

### artists
- PK: `id`
- FK: (ninguna)

### albums
- PK: `id`
- FK:
  - `artist_id` → `artists.id`

### songs
- PK: `id`
- FK:
  - `artist_id` → `artists.id`
  - `album_id` → `albums.id` (puede ser NULL)

---

### playlists
- PK: `id`
- FK:
  - `user_id` → `users.id`

### playlist_songs (tabla puente N–N)
- PK (compuesta): (`playlist_id`, `song_id`)
- FK:
  - `playlist_id` → `playlists.id`
  - `song_id` → `songs.id`

---

### missions
- PK: `id`
- FK: (ninguna)

### user_missions (tabla puente N–N)
- PK (compuesta): (`user_id`, `mission_id`)
- FK:
  - `user_id` → `users.id`
  - `mission_id` → `missions.id`

---

### achievements
- PK: `id`
- FK: (ninguna)

### user_achievements (tabla puente N–N)
- PK (compuesta): (`user_id`, `achievement_id`)
- FK:
  - `user_id` → `users.id`
  - `achievement_id` → `achievements.id`

---

### collectibles
- PK: `id`
- FK: (ninguna)

### user_collectibles (tabla puente N–N)
- PK (compuesta): (`user_id`, `collectible_id`)
- FK:
  - `user_id` → `users.id`
  - `collectible_id` → `collectibles.id`

---

### story_nodes
- PK: `id`
- FK: (ninguna)

### user_story_progress
- PK (compuesta): (`user_id`, `story_node_id`)
- FK:
  - `user_id` → `users.id`
  - `story_node_id` → `story_nodes.id`

---

### portal_tracks
- PK: `id`
- Restricción/índice útil:
  - `member_index` es UNIQUE (sirve para identificar un track por índice de miembro)
- FK: (ninguna)

### portal_track_listens
- PK: `id`
- FK:
  - `track_id` → `portal_tracks.id` (ON DELETE CASCADE)
  - `user_id` → `users.id` (NULL permitido; ON DELETE SET NULL)

### portal_spotify_clicks
- PK: `id`
- FK:
  - `user_id` → `users.id` (NULL permitido; ON DELETE SET NULL)

---

## Consultas para “verlo con datos” (joins)

### 1) Usuarios y sus roles
```sql
SELECT u.id, u.email, r.name AS role
FROM user_roles ur
JOIN users u ON u.id = ur.user_id
JOIN roles r ON r.id = ur.role_id
ORDER BY u.id;
```

### 2) Playlists con dueño
```sql
SELECT p.id, p.name, u.email
FROM playlists p
JOIN users u ON u.id = p.user_id
ORDER BY p.id;
```

### 3) Canciones dentro de playlists
```sql
SELECT p.name AS playlist, s.title AS song
FROM playlist_songs ps
JOIN playlists p ON p.id = ps.playlist_id
JOIN songs s ON s.id = ps.song_id
ORDER BY p.id, s.id;
```

### 4) Misiones por usuario
```sql
SELECT u.email, m.title, um.status
FROM user_missions um
JOIN users u ON u.id = um.user_id
JOIN missions m ON m.id = um.mission_id
ORDER BY u.id, m.id;
```

### 5) Clics a Spotify (con o sin usuario)
```sql
SELECT c.id, c.clicked_at, c.spotify_track_id, c.track_name,
       u.email AS clicked_by
FROM portal_spotify_clicks c
LEFT JOIN users u ON u.id = c.user_id
ORDER BY c.id DESC
LIMIT 50;
```

---

## Consulta para listar TODAS las FK automáticamente (por sistema)
```sql
SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA='btsecho'
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, COLUMN_NAME;
```
