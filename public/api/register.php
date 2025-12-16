<?php
// Archivo: public/api/register.php — Propósito: registrar usuario y crear progreso inicial (user_progress).
require_once __DIR__ . '/_api.php';
api_bootstrap(false);

// WHY: share boilerplate JSON parsing/response helpers across endpoints.
require_once __DIR__ . "/../../config/database.php";

api_require_method('POST');

$data = api_read_json_body();

$name = trim($data["name"] ?? "");
$email = trim($data["email"] ?? "");
$pass  = trim($data["password"] ?? "");

if (!$name || !$email || !$pass) {
  api_fail(400, "Completa todos los campos");
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  api_fail(400, "Correo inválido");
}

if (mb_strlen($pass) < 8) {
  api_fail(400, "La contraseña debe tener mínimo 8 caracteres");
}

$hash = password_hash($pass, PASSWORD_DEFAULT);

try {
  $pdo->beginTransaction();

  $stmt = $pdo->prepare(
    "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)"
  );
  $stmt->execute([$name, $email, $hash]);

  // Sistema de niveles (MVP): inicializamos progreso
  $userId = (int)$pdo->lastInsertId();
  $stmt = $pdo->prepare("INSERT INTO user_progress (user_id, level, experience) VALUES (?, 1, 0)");
  $stmt->execute([$userId]);

  $pdo->commit();

  api_ok(["message" => "Registro exitoso 💜"]);
} catch (PDOException $e) {
  if ($pdo->inTransaction()) {
    $pdo->rollBack();
  }
  if ((string)$e->getCode() === "23000") {
    api_fail(409, "Correo ya registrado");
  }

  api_fail(500, "Error interno del servidor");
}
