<?php
require_once __DIR__ . '/_api.php';
api_bootstrap(false);

// WHY: shared helpers keep responses consistent and reduce boilerplate.

// conexión DB
require_once __DIR__ . "/../../config/database.php";

// leer JSON
$data = api_read_json_body();

$token   = trim($data["token"] ?? "");
$newPass = trim($data["password"] ?? "");

// validar entrada
if (empty($token) || empty($newPass)) {
    api_fail(400, "Token o contraseña faltante");
}

if (mb_strlen($newPass) < 8) {
    api_fail(400, "La contraseña debe tener mínimo 8 caracteres");
}

try {
    // 1️⃣ buscar token válido
    $stmt = $pdo->prepare("
        SELECT pr.user_id
        FROM password_resets pr
        WHERE pr.reset_token = ?
          AND pr.used = 0
          AND pr.expires_at > NOW()
        LIMIT 1
    ");
    $stmt->execute([$token]);
    $reset = $stmt->fetch();

    if (!$reset) {
        api_fail(400, "Token inválido o expirado");
    }

    $userId = $reset["user_id"];

    // 2️⃣ hash de nueva contraseña
    $hashedPass = password_hash($newPass, PASSWORD_DEFAULT);

    // 3️⃣ actualizar contraseña
    $stmt = $pdo->prepare("
        UPDATE users
        SET password_hash = ?
        WHERE id = ?
    ");
    $stmt->execute([$hashedPass, $userId]);

    // 4️⃣ marcar token como usado
    $stmt = $pdo->prepare("
        UPDATE password_resets
        SET used = 1
        WHERE reset_token = ?
    ");
    $stmt->execute([$token]);

    // respuesta final
    api_ok([
        "message" => "Contraseña actualizada correctamente"
    ]);

} catch (Exception $e) {
    api_fail(500, "Error interno del servidor");
}
