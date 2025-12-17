# Archivo: scripts/setup.ps1 — Proposito: setup automatico (crea database/.env si falta y levanta Docker Compose).
param(
  [switch]$NonInteractive,
  [string]$SpotifyClientId,
  [string]$SpotifyClientSecret,
  [switch]$OpenBrowser
)

# BTS Echo — Setup automatico (Windows + Docker)
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

  foreach ($line in (Get-Content -LiteralPath $Path -Encoding UTF8 -ErrorAction Stop)) {
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
  $knownKeys = @(
    'SPOTIFY_CLIENT_ID',
    'SPOTIFY_CLIENT_SECRET',
    'BTSECHO_AUTH_SECRET',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USERNAME',
    'SMTP_PASSWORD',
    'APP_BASE_URL',
    'APP_DEBUG',
    'SMTP_AUTH',
    'SMTP_SECURE',
    'MAIL_FROM',
    'BTSECHO_SPOTIFY_TOKEN_CACHE'
  )

  $lines = @(
    '# Archivo local de entorno (NO subir a git).',
    '# Spotify (opcional): si esta vacio, el sitio funciona pero sin Top BTS desde Spotify.',
    "SPOTIFY_CLIENT_ID=$($Values['SPOTIFY_CLIENT_ID'])",
    "SPOTIFY_CLIENT_SECRET=$($Values['SPOTIFY_CLIENT_SECRET'])",
    '',
    '# Auth (recomendado): secreto para firmar tokens Bearer (HMAC)',
    "BTSECHO_AUTH_SECRET=$($Values['BTSECHO_AUTH_SECRET'])",
    '',
    '# Correo (por defecto: MailHog local via Docker)',
    '# UI: http://localhost:8025',
    "SMTP_HOST=$($Values['SMTP_HOST'])",
    "SMTP_PORT=$($Values['SMTP_PORT'])",
    "SMTP_USERNAME=$($Values['SMTP_USERNAME'])",
    "SMTP_PASSWORD=$($Values['SMTP_PASSWORD'])",
    '',
    '# URL base publica para construir el enlace del correo (reset-password)',
    "APP_BASE_URL=$($Values['APP_BASE_URL'])",
    '',
    '# Debug (0/1): si es 1, las APIs pueden devolver info extra en errores',
    "APP_DEBUG=$($Values['APP_DEBUG'])",
    '',
    '# Opcionales (para controlar PHPMailer)',
    "SMTP_AUTH=$($Values['SMTP_AUTH'])",
    "SMTP_SECURE=$($Values['SMTP_SECURE'])",
    "MAIL_FROM=$($Values['MAIL_FROM'])",
    '',
    '# Spotify (opcional): ruta del cache server-side del token client_credentials',
    "BTSECHO_SPOTIFY_TOKEN_CACHE=$($Values['BTSECHO_SPOTIFY_TOKEN_CACHE'])"
  )

  # Preserve unknown keys so we don't accidentally drop local config.
  $extraKeys = @()
  foreach ($k in $Values.Keys) {
    if ($knownKeys -notcontains $k) { $extraKeys += $k }
  }
  if ($extraKeys.Count -gt 0) {
    $lines += ''
    $lines += '# Otros (preservados)'
    foreach ($k in ($extraKeys | Sort-Object)) {
      $v = $Values[$k]
      if ($null -eq $v) { $v = '' }
      $lines += "$k=$v"
    }
  }

  # Keep .env strictly portable and avoid encoding issues in Windows PowerShell.
  Set-Content -LiteralPath $Path -Value $lines -Encoding ASCII
}

# Repo root = carpeta padre de /scripts
$repoRoot = Split-Path -Parent $PSScriptRoot
$dbDir = Join-Path $repoRoot 'database'
$envPath = Join-Path $dbDir '.env'
$envExamplePath = Join-Path $dbDir '.env.example'

Write-Info "Repo: $repoRoot"

# Requisitos
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker no esta instalado o no esta en PATH. Instala Docker Desktop y vuelve a ejecutar este script.'
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
$dirty = $false
if (-not $values.ContainsKey('SPOTIFY_CLIENT_ID')) { $values['SPOTIFY_CLIENT_ID'] = '' }
if (-not $values.ContainsKey('SPOTIFY_CLIENT_SECRET')) { $values['SPOTIFY_CLIENT_SECRET'] = '' }

# Auth secret (para firmar tokens). Si no existe, lo generamos.
if (-not $values.ContainsKey('BTSECHO_AUTH_SECRET')) { $values['BTSECHO_AUTH_SECRET'] = '' }
if (-not $values['BTSECHO_AUTH_SECRET'] -or $values['BTSECHO_AUTH_SECRET'].Trim().Length -lt 16) {
  try {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    $values['BTSECHO_AUTH_SECRET'] = ([Convert]::ToBase64String($bytes)).TrimEnd('=')
    Write-Ok 'Generado BTSECHO_AUTH_SECRET (tokens mas seguros)'
    $dirty = $true
  } catch {
    # Fallback simple (mejor que vacio)
    $values['BTSECHO_AUTH_SECRET'] = ([Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N'))
    Write-Warn 'No se pudo usar RNGCrypto; se genero un secret alternativo.'
    $dirty = $true
  }
}

# Defaults para correo via MailHog
if (-not $values.ContainsKey('SMTP_HOST')) { $values['SMTP_HOST'] = 'mailhog' }
if (-not $values.ContainsKey('SMTP_PORT')) { $values['SMTP_PORT'] = '1025' }
if (-not $values.ContainsKey('SMTP_USERNAME')) { $values['SMTP_USERNAME'] = '' }
if (-not $values.ContainsKey('SMTP_PASSWORD')) { $values['SMTP_PASSWORD'] = '' }
if (-not $values.ContainsKey('APP_BASE_URL')) { $values['APP_BASE_URL'] = 'http://localhost:8000' }
if (-not $values.ContainsKey('APP_DEBUG')) { $values['APP_DEBUG'] = '0' }
if (-not $values.ContainsKey('SMTP_AUTH')) { $values['SMTP_AUTH'] = '0' }
if (-not $values.ContainsKey('SMTP_SECURE')) { $values['SMTP_SECURE'] = 'none' }
if (-not $values.ContainsKey('MAIL_FROM')) { $values['MAIL_FROM'] = 'no-reply@btsecho.local' }
if (-not $values.ContainsKey('BTSECHO_SPOTIFY_TOKEN_CACHE')) { $values['BTSECHO_SPOTIFY_TOKEN_CACHE'] = '' }

# Si vienen por parametro, sobreescriben
if ($SpotifyClientId -and $SpotifyClientId.Trim().Length -gt 0) {
  $values['SPOTIFY_CLIENT_ID'] = $SpotifyClientId.Trim()
  $dirty = $true
}
if ($SpotifyClientSecret -and $SpotifyClientSecret.Trim().Length -gt 0) {
  $values['SPOTIFY_CLIENT_SECRET'] = $SpotifyClientSecret.Trim()
  $dirty = $true
}

$hasSpotify = ($values['SPOTIFY_CLIENT_ID'].Trim().Length -gt 0) -and ($values['SPOTIFY_CLIENT_SECRET'].Trim().Length -gt 0)

if (-not $hasSpotify) {
  Write-Warn 'Spotify aun no esta configurado (esto es opcional).'

  if ($NonInteractive) {
    Write-Info 'Modo NonInteractive: saltando prompts. (El portal levantara igual)'
  } else {
    $ans = Read-Host 'Quieres configurar Spotify ahora? (S/N) [S]'
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
      $dirty = $false
    } else {
      Write-Info 'Saltando configuracion de Spotify. (El portal levantara igual)'
    }
  }
} else {
  Write-Ok 'Spotify ya esta configurado (database/.env)'
}

if ($dirty) {
  Write-DotEnv $envPath $values
  Write-Ok 'Actualizado database/.env'
  $dirty = $false
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
    Write-Warn "No se pudo abrir el navegador automaticamente. Abre manualmente: $url"
  }
}
