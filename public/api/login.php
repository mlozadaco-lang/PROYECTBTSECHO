<?php
require_once __DIR__ . '/_api.php';
api_bootstrap(true);

// WHY: keep endpoint short + consistent JSON errors via helpers.

require_once __DIR__ . "/../../config/database.php";

$data = api_read_json_body();

$email = trim($data["email"] ?? "");
$pass  = trim($data["password"] ?? "");

if (!$email || !$pass) {
  api_fail(400, "Campos obligatorios");
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  api_fail(400, "Correo inválido");
}

$stmt = $pdo->prepare(
  "SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1"
);
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || !password_verify($pass, $user["password_hash"])) {
  api_fail(401, "Credenciales incorrectas");
}

$_SESSION["user_id"] = $user["id"];
$_SESSION["name"] = $user["name"];
$_SESSION["email"] = $user["email"];

api_ok([
  "name" => $user["name"],
  "message" => "Login exitoso"
]);
