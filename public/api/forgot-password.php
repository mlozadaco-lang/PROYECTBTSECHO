<?php
header("Content-Type: application/json; charset=utf-8");

require_once __DIR__ . "/../../config/database.php";

// PHPMailer (sin Composer)
require_once __DIR__ . "/../../lib/PHPMailer/Exception.php";
require_once __DIR__ . "/../../lib/PHPMailer/PHPMailer.php";
require_once __DIR__ . "/../../lib/PHPMailer/SMTP.php";

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

/* =====================================================
   1. LEER EMAIL
===================================================== */
$raw = file_get_contents("php://input");
$json = json_decode($raw, true);

$email = "";
if (is_array($json) && isset($json["email"])) {
    $email = trim($json["email"]);
} elseif (isset($_POST["email"])) {
    $email = trim($_POST["email"]);
}

if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode([
        "success" => false,
        "message" => "Correo inválido."
    ]);
    exit;
}

/* =====================================================
   2. BUSCAR USUARIO
===================================================== */
$stmt = $pdo->prepare("
    SELECT id, name, email
    FROM users
    WHERE email = ?
    LIMIT 1
");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    echo json_encode([
        "success" => false,
        "message" => "El correo no está registrado."
    ]);
    exit;
}

/* =====================================================
   3. CREAR TOKEN
===================================================== */
$token = bin2hex(random_bytes(32));
$expiresAt = date("Y-m-d H:i:s", time() + 1800); // 30 min

$stmt = $pdo->prepare("
    INSERT INTO password_resets (user_id, reset_token, expires_at)
    VALUES (?, ?, ?)
");
$stmt->execute([
    $user["id"],
    $token,
    $expiresAt
]);

/* =====================================================
   4. ENLACE DE RECUPERACIÓN
===================================================== */
$resetLink = "http://localhost:8000/reset-password.html?token=" . urlencode($token);

/* =====================================================
   5. ENVIAR CORREO
===================================================== */
$mailConfig = require __DIR__ . "/../../config/mail.php";

$mail = new PHPMailer(true);

try {
    $mail->SMTPDebug = 0;
    $mail->isSMTP();
    $mail->Host = $mailConfig["host"];
    $mail->SMTPAuth = true;
    $mail->Username = $mailConfig["username"];
    $mail->Password = $mailConfig["password"];
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = (int)$mailConfig["port"];
    $mail->CharSet = "UTF-8";

    $mail->setFrom($mailConfig["username"], "BTS Echo 💜");
    $mail->addAddress($user["email"], $user["name"]);

    $mail->isHTML(true);
    $mail->Subject = "Recuperación de contraseña - BTS Echo";
    $mail->Body = "
        <p>Hola <b>{$user['name']}</b> 💜</p>
        <p>Solicitaste recuperar tu contraseña.</p>
        <p>
          <a href='{$resetLink}'>Restablecer contraseña</a>
        </p>
        <p>Este enlace vence en 30 minutos.</p>
    ";

    $mail->send();

    echo json_encode([
        "success" => true,
        "message" => "Te enviamos un enlace de recuperación a tu correo 💜"
    ]);
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "No se pudo enviar el correo.",
        "debug" => $mail->ErrorInfo
    ]);
}
