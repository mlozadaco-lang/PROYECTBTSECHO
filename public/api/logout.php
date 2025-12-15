<?php
session_start();

header("Content-Type: application/json; charset=utf-8");

session_unset();  // Limpia las variables de sesión
session_destroy();  // Destruye la sesión

echo json_encode([
    "success" => true
]);
