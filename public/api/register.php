<?php
header("Content-Type: application/json");
require "../config/database.php";

$data = json_decode(file_get_contents("php://input"), true);

$name = trim($data["name"] ?? "");
$email = trim($data["email"] ?? "");
$pass  = trim($data["password"] ?? "");

if (!$name || !$email || !$pass) {
  echo json_encode(["success" => false, "message" => "Completa todos los campos"]);
  exit;
}

$hash = password_hash($pass, PASSWORD_DEFAULT);

try {
  $stmt = $pdo->prepare(
    "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)"
  );
  $stmt->execute([$name, $email, $hash]);

  echo json_encode(["success" => true, "message" => "Registro exitoso 💜"]);
} catch (PDOException $e) {
  echo json_encode(["success" => false, "message" => "Correo ya registrado"]);
}
