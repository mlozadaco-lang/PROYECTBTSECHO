# PROYECTBTSECHO

Proyecto web (Front estático) + APIs en PHP + MySQL (Docker).

Si quieres una vista completa del proyecto (qué hay, cómo se conecta todo), revisa el archivo **resumen** en la raíz del repo.

## Cambios recientes (MVP)

- Misiones con progreso real:
  - `GET /api/missions.php` devuelve misiones + `status/completed_at` por usuario (si hay sesión).
  - `POST /api/complete-mission.php` marca una misión como completada y la persiste en `user_missions`.
  - Anti-trampa (MVP): para completar se pide `proof` (texto o link) y se guarda en `user_missions.proof`.
- Niveles (MVP): al completar misiones se suma XP y sube el nivel automáticamente.
- UI: barra de progreso al siguiente nivel (Portal y Misiones) basada en `GET /api/progress.php`.
- Se agregaron misiones de ejemplo en `database/init.sql`.
- Se reforzó validación de contraseña: mínimo **8 caracteres** (registro y reset).
- Recuperación de contraseña: por seguridad no revela si un correo existe; `APP_DEBUG=1` habilita debug SMTP.
- Música (Portal): reproductor superior con `Prev/Play/Next`, barra de progreso y volumen.
  - Guarda en el navegador (localStorage): volumen, pista y segundo donde se quedó.
  - Ubicación: en el header, arriba del botón de Login (versión compacta).
- Música (Top semanal por clics): el portal registra clics a enlaces de Spotify y muestra un Top semanal (últimos 7 días) basado en clics.
- Música (Top BTS en Spotify): el portal muestra el Top de BTS desde Spotify (sin login).

## Mapa del proyecto (1 minuto)

La idea general: **Front estático** (HTML/CSS/JS) consume **APIs PHP** en `public/api/` y persiste datos en **MySQL**.

- **Portal** (`public/index.html`)
  - UI de personajes + burbuja Spotify embed: `public/assets/js/members.js` + `public/assets/js/script.js`
  - Reproductor superior (audio local) + Top semanal (clics Spotify): `public/assets/js/player.js`
    - Consume: `GET /api/spotify-clicks-top-weekly.php`
  - Top BTS actual (Spotify real, sin login) + tracking de clics: `public/assets/js/spotify.js`
    - Consume: `GET /api/spotify-bts-top.php`, `POST /api/spotify-click.php`
  - Login/registro/logout + header: `public/assets/js/auth.js`
    - Consume: `POST /api/login.php`, `POST /api/register.php`, `POST /api/logout.php`, `GET /api/session.php`
  - Army Mode (tema) + autocompletar misión: `public/assets/js/theme.js`
    - Consume: `GET /api/session.php`, `GET /api/missions.php`, `POST /api/complete-mission.php`, `GET /api/progress.php`
  - Chat (simulado, sin backend): `public/assets/js/chat.js`

- **Misiones** (`public/missions/index.html`)
  - Carga/render de misiones + completar misión + barra de progreso: `public/assets/js/missions.js`
    - Consume: `GET /api/missions.php`, `POST /api/complete-mission.php`, `GET /api/session.php`, `GET /api/progress.php`

- **Reset password** (`public/reset-password.html`)
  - Form + envío de nueva contraseña con token: `public/assets/js/reset-password.js`
    - Consume: `POST /api/reset-password.php`

- **EchoVerse** (`public/echoverse/index.html`)
  - Interacciones simples (front): `public/assets/js/echoverse.js`

Notas:
- Spotify OAuth (Top personal) y el tracking de “escuchas locales” ya no se usan (se dejaron endpoints antiguos como `410 Gone` para evitar confusiones).

## Estructura

- `public/` – Sitio web (HTML/CSS/JS) y endpoints PHP bajo `public/api/`
- `public/assets/` – Recursos del front centralizados
  - `public/assets/css/` – CSS
  - `public/assets/js/` – JS
  - `public/assets/images/` – Imágenes
  - `public/assets/audio/` – Audios
  - `public/assets/video/` – Videos
- `config/` – Configuración (DB, correo)
- `database/` – MySQL con Docker Compose + script de inicialización
- `docs/` – Documentación del proyecto
- `lib/PHPMailer/` – PHPMailer incluido sin Composer

> Nota: se eliminaron carpetas antiguas (styles/Script/Imagenes/Audios/Videos) y se migró todo a `public/assets/`.

## Páginas

- Portal principal: `public/index.html`
- EchoVerse: `public/echoverse/index.html`
- Misiones: `public/missions/index.html`
- Reset password: `public/reset-password.html`

### Qué hace cada página (rápido)

- **Portal**: UI principal + login/registro/logout + chat (simulado) + botones a EchoVerse/Misiones.
- **Portal (música)**: el reproductor superior usa audios locales en `public/assets/audio/` y recuerda el estado.
- **EchoVerse**: vista temática con eras (front).
- **Misiones**: lista de misiones (puede cargar desde backend si existe data).
- **Reset password**: formulario para cambiar contraseña usando `?token=...`.

## Endpoints (API)

Los endpoints están en `public/api/` y se consumen desde el front con `fetch('/api/...')`.


- La tabla `user_progress` guarda `level` y `experience` (XP total).
- Regla actual (simple): cada **20 XP** subes 1 nivel.
- Cuando completas una misión por primera vez, se suma `missions.reward_xp` a tu XP.
- Si intentas completar una misión ya completada, no vuelve a sumar XP.
- El Portal y Misiones muestran una barra de progreso dentro del nivel (XP hacia el siguiente nivel).

Notas rápidas:
- **Contraseñas**: en registro y reset se exige mínimo **8 caracteres**.
- **Forgot password**: por seguridad responde igual aunque el correo no exista.

## Ver el front (sin backend)

Puedes abrir `public/index.html` directamente en el navegador.

> Algunas funciones que llaman a `/api/*` no funcionarán sin un servidor PHP.

Recomendado: servir `public/` con un servidor local (Apache/Nginx/PHP) para evitar problemas de rutas/Fetch.

## Base de datos (Docker)

## Setup automático (Docker, recomendado)

En una PC nueva (Windows), puedes dejarlo listo con **1 comando**:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1 -NonInteractive
```

Si te pasaron el proyecto por **WhatsApp (ZIP)**:
- Descomprime la carpeta.
- Abre PowerShell en la **raíz** del proyecto (donde están `scripts/` y `database/`).
- Ejecuta el comando de arriba y listo.

### Modo seguro (ZIP sin claves)

Si NO quieres mandar claves dentro del ZIP:
- Asegúrate de que `config/spotify.php` **no tenga** el `client_secret` pegado.
- NO incluyas `database/.env` en el ZIP (si existe).
- En la otra PC, ejecuta el setup pasando las claves por comando:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1 -NonInteractive -SpotifyClientId "TU_ID" -SpotifyClientSecret "TU_SECRET"
```

Si quieres que también te abra el navegador al final:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1 -NonInteractive -OpenBrowser
```

Esto:
- crea `database/.env` si no existe (usa `database/.env.example` como base),
- (opcional) configura `SPOTIFY_CLIENT_ID` y `SPOTIFY_CLIENT_SECRET` (si las pasas por parámetro),
- levanta MySQL + PHP/Apache con `docker compose up -d --build`,
- y deja el sitio en `http://localhost:8000/`.

Opcional (para dejar Spotify listo desde el comando):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1 -NonInteractive -SpotifyClientId "TU_ID" -SpotifyClientSecret "TU_SECRET"
```

Desde la carpeta `database/`:

```bash
docker compose up -d
docker compose ps
```

### Servidor web PHP (Docker)

El `docker-compose.yml` de `database/` también incluye un servicio `web` (PHP + Apache).

- El contenedor monta el repo en `/var/www` y sirve `public/` como DocumentRoot.
- Esto permite que las APIs incluyan `config/` y `lib/` usando rutas relativas (ej. `__DIR__/../../config/database.php`).

Desde `database/`:

```bash
docker compose up -d --build
```

Luego abre:

- `http://localhost:8000/` (portal)
- `http://localhost:8000/api/login.php` (endpoint)

Credenciales (ver `config/database.php`):

- Host: `127.0.0.1`
- DB: `btsecho`
- User: `admin`
- Password: `admin123`

## Backend (PHP)

Las APIs están en `public/api/`. Para ejecutarlas necesitas un servidor con PHP (por ejemplo XAMPP/WAMP o PHP + Apache/Nginx).

DocumentRoot recomendado: apuntar a `public/`.

## Correo (recuperación de contraseña)

La API `public/api/forgot-password.php` usa PHPMailer y lee configuración desde `config/mail.php`.

`config/mail.php` está en `.gitignore` (para no subir credenciales). Usa `config/mail.example.php` como plantilla.

Configura estas variables de entorno antes de probar envío de correos:

- `SMTP_HOST`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_PORT` (opcional; por defecto `587`)

Debug opcional:
- Si quieres ver detalles del error SMTP en la respuesta JSON, define `APP_DEBUG=1`.

### Docker: correo listo “sin configurar” (MailHog)

En Docker, el proyecto incluye **MailHog** por defecto, así que el envío de correo funciona sin credenciales externas.

- Bandeja (UI): `http://localhost:8025/`
- SMTP interno: `mailhog:1025`

Si quieres usar un SMTP real (Gmail/Outlook/etc.), cambia las variables `SMTP_*` en `database/.env`.

## Spotify

El Portal muestra:
- **Top BTS en Spotify (actual)** sin login usando `GET /api/spotify-bts-top.php` (Spotify Web API con `client_credentials`).
- **Top semanal (clics Spotify)** usando MySQL (`POST /api/spotify-click.php` + `GET /api/spotify-clicks-top-weekly.php`).

Nota: el **Top personal del usuario (OAuth)** fue removido porque Spotify requiere redirect URI HTTPS en OAuth, y en local (`http://localhost`) suele bloquearlo.

### Variables de entorno requeridas

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`

Alternativa (más fácil en XAMPP/WAMP):
- Copia `config/spotify.example.php` a `config/spotify.php` y pega tus credenciales ahí.
- `config/spotify.php` está en `.gitignore` (no se sube al repo).

Ejemplo recomendado en Docker:

- Crea un archivo `database/.env` (no se sube a git) con:

  - `SPOTIFY_CLIENT_ID=...`
  - `SPOTIFY_CLIENT_SECRET=...`

Luego levanta Docker desde `database/`:

```bash
docker compose up -d --build
```

### Troubleshooting (Docker)

Si ves “Spotify no está configurado…”:
- Asegúrate de crear `database/.env` (en la misma carpeta donde está `database/docker-compose.yml`).
- Reinicia los contenedores:

```bash
docker compose down
docker compose up -d --build
```

Nota: se removieron endpoints de diagnóstico (config/token check) para reducir superficie de código.

### Config en Spotify Developer Dashboard

- Crea una app en Spotify Developers.
- Copia `Client ID` y `Client Secret`.

(No se requiere Redirect URI para el modo actual sin login.)

## Troubleshooting

- **Veo “Error” al registrar/login**: asegúrate de abrir por HTTP (`http://localhost:8000/`). Con `file://` no funciona `/api/*`.
- **Puerto 8000 ocupado**: cambia el puerto en `database/docker-compose.yml` (ej. `8001:80`) y abre `http://localhost:8001/`.
- **Docker está instalado pero no conecta**: abre Docker Desktop y vuelve a probar `docker ps`.

## Datos de ejemplo

El archivo `database/init.sql` incluye misiones de ejemplo para que `GET /api/missions.php` devuelva datos y la página de Misiones pueda mostrarlos.

## Migración rápida (si tu BD ya existía)

Si ya tenías el contenedor/volumen MySQL creado antes, ejecuta este `ALTER` una sola vez:

```sql
ALTER TABLE user_missions ADD COLUMN proof TEXT NULL;

-- Nota: el tracking de “escuchas locales” fue removido; el Top musical actual se basa en clics a Spotify.
```
