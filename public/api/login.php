<?php
header("Content-Type: application/json; charset=utf-8");
session_start();

require_once __DIR__ . "/../../config/database.php";

$data = json_decode(file_get_contents("php://input"), true);

$email = trim($data["email"] ?? "");
$pass  = trim($data["password"] ?? "");

if (!$email || !$pass) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => "Campos obligatorios"]);
  exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => "Correo inválido"]);
  exit;
}

$stmt = $pdo->prepare(
  "SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1"
);
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || !password_verify($pass, $user["password_hash"])) {
  http_response_code(401);
  echo json_encode(["success" => false, "message" => "Credenciales incorrectas"]);
  exit;
}

$_SESSION["user_id"] = $user["id"];
$_SESSION["name"] = $user["name"];
$_SESSION["email"] = $user["email"];

echo json_encode([
  "success" => true,
  "name" => $user["name"],
  "message" => "Login exitoso"
]);
