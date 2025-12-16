<?php
// Archivo: public/api/logout.php — Propósito: cerrar sesión (session_unset/session_destroy) y responder JSON; acepta GET/POST por compat.
require_once __DIR__ . '/_api.php';
api_bootstrap(true);

// WHY: centralize JSON responses and keep endpoint small.

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
if ($method !== 'POST' && $method !== 'GET') {
	api_fail(405, 'Método no permitido');
}

session_unset();  // Limpia las variables de sesión
session_destroy();  // Destruye la sesión

api_ok();

