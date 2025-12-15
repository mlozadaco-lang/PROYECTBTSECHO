<?php
header("Content-Type: application/json; charset=utf-8");

// conexión DB
require_once __DIR__ . "/../../config/database.php";

// leer JSON
$data = json_decode(file_get_contents("php://input"), true);

$token   = trim($data["token"] ?? "");
$newPass = trim($data["password"] ?? "");

// validar entrada
if (empty($token) || empty($newPass)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Token o contraseña faltante"
    ]);
    exit;
}

if (mb_strlen($newPass) < 8) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "La contraseña debe tener mínimo 8 caracteres"
    ]);
    exit;
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
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Token inválido o expirado"
        ]);
        exit;
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
    echo json_encode([
        "success" => true,
        "message" => "Contraseña actualizada correctamente"
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error interno del servidor"
    ]);
}
