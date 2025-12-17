<?php
// Archivo: public/api/index.php — Propósito: router opcional (mini-framework) para rutas /api/* sin extensión.
// Nota: los endpoints existentes /api/*.php siguen funcionando igual.

declare(strict_types=1);

require_once __DIR__ . '/_api.php';
api_bootstrap(false);

$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$uriPath = is_string($uriPath) ? $uriPath : '/';

// /api (carpeta donde vive este router)
$base = dirname($_SERVER['SCRIPT_NAME'] ?? '/api/index.php');
$base = str_replace('\\', '/', $base);
$base = rtrim($base, '/');

$route = $uriPath;
if ($base !== '' && $base !== '/' && str_starts_with($route, $base)) {
  $route = substr($route, strlen($base));
}
$route = trim($route, '/');
$route = strtolower($route);

// Home: mostrar rutas disponibles (útil para debug)
if ($route === '' || $route === 'index.php') {
  api_ok([
    'message' => 'API router OK (compat). Usa /api/*.php o rutas limpias (/api/login, /api/session, ...).',
    'routes' => [
      'POST /api/login',
      'POST /api/register',
      'GET /api/session',
      'GET|POST /api/logout',
      'GET /api/missions',
      'POST /api/complete-mission',
      'GET /api/progress',
      'POST /api/forgot-password',
      'POST /api/reset-password',
      'GET /api/spotify-bts-top',
      'POST /api/spotify-click',
      'GET /api/spotify-clicks-top-weekly',
    ],
  ]);
}

// Map simple: rutas limpias -> archivos existentes.
$map = [
  'login' => 'login.php',
  'register' => 'register.php',
  'session' => 'session.php',
  'logout' => 'logout.php',
  'missions' => 'missions.php',
  'complete-mission' => 'complete-mission.php',
  'progress' => 'progress.php',
  'forgot-password' => 'forgot-password.php',
  'reset-password' => 'reset-password.php',
  'spotify-bts-top' => 'spotify-bts-top.php',
  'spotify-click' => 'spotify-click.php',
  'spotify-clicks-top-weekly' => 'spotify-clicks-top-weekly.php',
];

if (!isset($map[$route])) {
  api_fail(404, 'Ruta no encontrada', ['route' => $route]);
}

$target = __DIR__ . '/' . $map[$route];
if (!is_file($target)) {
  api_fail(500, 'Ruta configurada pero el archivo no existe', ['route' => $route]);
}

require $target;
