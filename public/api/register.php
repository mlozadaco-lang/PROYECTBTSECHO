<?php
header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . "/../../config/database.php";

$data = json_decode(file_get_contents("php://input"), true);

$name = trim($data["name"] ?? "");
$email = trim($data["email"] ?? "");
$pass  = trim($data["password"] ?? "");

if (!$name || !$email || !$pass) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => "Completa todos los campos"]);
  exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => "Correo inválido"]);
  exit;
}

if (mb_strlen($pass) < 8) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => "La contraseña debe tener mínimo 8 caracteres"]);
  exit;
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

  echo json_encode(["success" => true, "message" => "Registro exitoso 💜"]);
} catch (PDOException $e) {
  if ($pdo->inTransaction()) {
    $pdo->rollBack();
  }
  if ((string)$e->getCode() === "23000") {
    http_response_code(409);
    echo json_encode(["success" => false, "message" => "Correo ya registrado"]);
    exit;
  }

  http_response_code(500);
  echo json_encode(["success" => false, "message" => "Error interno del servidor"]);
}
