<?php
// Archivo: public/api/login.php — Propósito: iniciar sesión (valida credenciales, crea $_SESSION y responde JSON).
require_once __DIR__ . '/_api.php';
api_bootstrap(true);

require_once __DIR__ . '/_db.php';

// WHY: keep endpoint short + consistent JSON errors via helpers.


$pdo = api_db();

api_require_method('POST');

$data = api_read_json_body();

api_require_fields($data, ['email', 'password'], 'Campos obligatorios');

$email = trim($data["email"] ?? "");
$pass  = trim($data["password"] ?? "");

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

// WHY: refresh session id after authentication.
session_regenerate_id(true);

$_SESSION["user_id"] = $user["id"];
$_SESSION["name"] = $user["name"];
$_SESSION["email"] = $user["email"];

$issued = api_issue_token((int)$user["id"], 86400);

api_ok([
  "name" => $user["name"],
  "message" => "Login exitoso",
  "token" => $issued["token"],
  "token_exp" => $issued["exp"],
]);
