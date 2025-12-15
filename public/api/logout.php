<?php
require_once __DIR__ . '/_api.php';
api_bootstrap(true);

// WHY: centralize JSON responses and keep endpoint small.

session_unset();  // Limpia las variables de sesión
session_destroy();  // Destruye la sesión

api_ok();

