# Archivo: scripts/setup.ps1 — Propósito: setup automático (crea database/.env si falta y levanta Docker Compose).
param(
  [switch]$NonInteractive,
  [string]$SpotifyClientId,
  [string]$SpotifyClientSecret,
  [switch]$OpenBrowser
)

# BTS Echo — Setup automático (Windows + Docker)
# - Crea database/.env (si falta)
# - (Opcional) configura credenciales Spotify
# - Levanta Docker Compose (MySQL + PHP/Apache)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info([string]$Message) { Write-Host $Message -ForegroundColor Cyan }
function Write-Warn([string]$Message) { Write-Host $Message -ForegroundColor Yellow }
function Write-Ok([string]$Message) { Write-Host $Message -ForegroundColor Green }

function Get-PlainTextFromSecureString([securestring]$Secure) {
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

function Parse-DotEnv([string]$Path) {
  $map = @{}
  if (-not (Test-Path -LiteralPath $Path)) { return $map }

  foreach ($line in (Get-Content -LiteralPath $Path -ErrorAction Stop)) {
    $trim = $line.Trim()
    if (-not $trim) { continue }
    if ($trim.StartsWith('#')) { continue }

    $idx = $trim.IndexOf('=')
    if ($idx -lt 1) { continue }

    $k = $trim.Substring(0, $idx).Trim()
    $v = $trim.Substring($idx + 1)
    $map[$k] = $v
  }

  return $map
}

function Write-DotEnv([string]$Path, [hashtable]$Values) {
  $lines = @(
    '# Archivo local de entorno (NO subir a git).',
    '# Spotify (opcional): si está vacío, el sitio funciona pero sin Top BTS desde Spotify.',
    "SPOTIFY_CLIENT_ID=$($Values['SPOTIFY_CLIENT_ID'])",
    "SPOTIFY_CLIENT_SECRET=$($Values['SPOTIFY_CLIENT_SECRET'])",
    '',
    '# Correo (por defecto: MailHog local via Docker)',
    '# UI: http://localhost:8025',
    "SMTP_HOST=$($Values['SMTP_HOST'])",
    "SMTP_PORT=$($Values['SMTP_PORT'])",
    "SMTP_USERNAME=$($Values['SMTP_USERNAME'])",
    "SMTP_PASSWORD=$($Values['SMTP_PASSWORD'])",
    "SMTP_AUTH=$($Values['SMTP_AUTH'])",
    "SMTP_SECURE=$($Values['SMTP_SECURE'])",
    "MAIL_FROM=$($Values['MAIL_FROM'])"
  )

  Set-Content -LiteralPath $Path -Value $lines -Encoding UTF8
}

# Repo root = carpeta padre de /scripts
$repoRoot = Split-Path -Parent $PSScriptRoot
$dbDir = Join-Path $repoRoot 'database'
$envPath = Join-Path $dbDir '.env'
$envExamplePath = Join-Path $dbDir '.env.example'

Write-Info "Repo: $repoRoot"

# Requisitos
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker no está instalado o no está en PATH. Instala Docker Desktop y vuelve a ejecutar este script.'
}

if (-not (Test-Path -LiteralPath $dbDir)) {
  throw "No existe la carpeta database/: $dbDir"
}

# Crear .env si falta
if (-not (Test-Path -LiteralPath $envPath)) {
  if (Test-Path -LiteralPath $envExamplePath) {
    Copy-Item -LiteralPath $envExamplePath -Destination $envPath -Force
    Write-Ok 'Creado database/.env desde .env.example'
  } else {
    Write-Ok 'Creado database/.env'
    Set-Content -LiteralPath $envPath -Value @('SPOTIFY_CLIENT_ID=','SPOTIFY_CLIENT_SECRET=') -Encoding UTF8
  }
}

# Completar Spotify (opcional)
$values = Parse-DotEnv $envPath
if (-not $values.ContainsKey('SPOTIFY_CLIENT_ID')) { $values['SPOTIFY_CLIENT_ID'] = '' }
if (-not $values.ContainsKey('SPOTIFY_CLIENT_SECRET')) { $values['SPOTIFY_CLIENT_SECRET'] = '' }

# Defaults para correo via MailHog
if (-not $values.ContainsKey('SMTP_HOST')) { $values['SMTP_HOST'] = 'mailhog' }
if (-not $values.ContainsKey('SMTP_PORT')) { $values['SMTP_PORT'] = '1025' }
if (-not $values.ContainsKey('SMTP_USERNAME')) { $values['SMTP_USERNAME'] = '' }
if (-not $values.ContainsKey('SMTP_PASSWORD')) { $values['SMTP_PASSWORD'] = '' }
if (-not $values.ContainsKey('SMTP_AUTH')) { $values['SMTP_AUTH'] = '0' }
if (-not $values.ContainsKey('SMTP_SECURE')) { $values['SMTP_SECURE'] = 'none' }
if (-not $values.ContainsKey('MAIL_FROM')) { $values['MAIL_FROM'] = 'no-reply@btsecho.local' }

# Si vienen por parámetro, sobreescriben
if ($SpotifyClientId -and $SpotifyClientId.Trim().Length -gt 0) {
  $values['SPOTIFY_CLIENT_ID'] = $SpotifyClientId.Trim()
}
if ($SpotifyClientSecret -and $SpotifyClientSecret.Trim().Length -gt 0) {
  $values['SPOTIFY_CLIENT_SECRET'] = $SpotifyClientSecret.Trim()
}

$hasSpotify = ($values['SPOTIFY_CLIENT_ID'].Trim().Length -gt 0) -and ($values['SPOTIFY_CLIENT_SECRET'].Trim().Length -gt 0)

if (-not $hasSpotify) {
  Write-Warn 'Spotify aún no está configurado (esto es opcional).'

  if ($NonInteractive) {
    Write-Info 'Modo NonInteractive: saltando prompts. (El portal levantará igual)'
  } else {
    $ans = Read-Host '¿Quieres configurar Spotify ahora? (S/N) [S]'
    if (-not $ans) { $ans = 'S' }

    if ($ans.Trim().ToUpperInvariant().StartsWith('S')) {
      $clientId = Read-Host 'SPOTIFY_CLIENT_ID'
      $secretSecure = Read-Host 'SPOTIFY_CLIENT_SECRET' -AsSecureString
      $clientSecret = Get-PlainTextFromSecureString $secretSecure

      if ($null -eq $clientId) { $clientId = '' }
      if ($null -eq $clientSecret) { $clientSecret = '' }

      $values['SPOTIFY_CLIENT_ID'] = $clientId.Trim()
      $values['SPOTIFY_CLIENT_SECRET'] = $clientSecret.Trim()

      Write-DotEnv $envPath $values
      Write-Ok 'Actualizado database/.env'
    } else {
      Write-Info 'Saltando configuración de Spotify. (El portal levantará igual)'
    }
  }
} else {
  Write-Ok 'Spotify ya está configurado (database/.env)'
}

# Si cambiamos valores por parámetro, guardarlos
if (($SpotifyClientId -and $SpotifyClientId.Trim()) -or ($SpotifyClientSecret -and $SpotifyClientSecret.Trim())) {
  Write-DotEnv $envPath $values
  Write-Ok 'Actualizado database/.env (por parámetros)'
}

# Levantar Docker
Write-Info 'Levantando contenedores (docker compose up -d --build)...'
Push-Location $dbDir
try {
  docker compose up -d --build
} finally {
  Pop-Location
}

Write-Ok 'Listo.'
$url = 'http://localhost:8000/'
Write-Host "Abre: $url"
Write-Host 'Si no carga, revisa: (cd database) docker compose ps'

if ($OpenBrowser) {
  try {
    Start-Process $url | Out-Null
  } catch {
    Write-Warn "No se pudo abrir el navegador automáticamente. Abre manualmente: $url"
  }
}
