<?php
// Archivo: public/api/reset-password.php — Propósito: restablecer contraseña usando token (password_resets) y marcar token como usado.
require_once __DIR__ . '/_api.php';
api_bootstrap(false);

require_once __DIR__ . '/_db.php';

// WHY: shared helpers keep responses consistent and reduce boilerplate.

// conexión DB
$pdo = api_db();

api_require_method('POST');

// leer JSON
$data = api_read_json_body();

api_require_fields($data, ['token', 'password'], 'Token o contraseña faltante');

$token   = trim((string)($data["token"] ?? ""));
$newPass = trim((string)($data["password"] ?? ""));

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
    api_fail_exception($e, 500, 'Error interno del servidor');
}
