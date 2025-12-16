<?php
// Archivo: config/database.php — Propósito: crea $pdo (PDO MySQL) usando env vars para que las APIs accedan a la DB.
$host = getenv("DB_HOST") ?: "127.0.0.1";
$db   = getenv("DB_NAME") ?: "btsecho";
$user = getenv("DB_USER") ?: "admin";
$pass = getenv("DB_PASS") ?: "admin123";

try {
  $pdo = new PDO(
    "mysql:host=$host;dbname=$db;charset=utf8mb4",
    $user,
    $pass,
    [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]
  );
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => "Error de conexión"]);
  exit;
}
