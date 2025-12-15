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
    http_response_code(400);
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
        "success" => true,
        "message" => "Si el correo existe, te enviaremos un enlace de recuperación 💜"
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
function getBaseUrl(): string {
    $env = getenv('APP_BASE_URL');
    if (is_string($env) && trim($env) !== '') {
        return rtrim(trim($env), '/');
    }

    $host = $_SERVER['HTTP_HOST'] ?? '';
    if (!is_string($host) || $host === '') {
        return 'http://localhost:8000';
    }

    $https = $_SERVER['HTTPS'] ?? '';
    $scheme = (!empty($https) && $https !== 'off') ? 'https' : 'http';
    return $scheme . '://' . $host;
}

function envFlag(string $key, ?string $default = null): ?string {
    $v = getenv($key);
    if ($v === false) return $default;
    return (string)$v;
}

function normalizeSecure(?string $value): string {
    $v = strtolower(trim((string)$value));
    if ($v === 'tls') return 'tls';
    if ($v === 'ssl') return 'ssl';
    return 'none';
}

function normalizeAuth(?string $value): bool {
    $v = strtolower(trim((string)$value));
    if ($v === '1' || $v === 'true' || $v === 'yes' || $v === 'on') return true;
    if ($v === '0' || $v === 'false' || $v === 'no' || $v === 'off') return false;
    return false;
}

$resetLink = getBaseUrl() . "/reset-password.html?token=" . urlencode($token);

/* =====================================================
   5. ENVIAR CORREO
===================================================== */
$mailConfigPath = __DIR__ . "/../../config/mail.php";
if (!file_exists($mailConfigPath)) {
    $mailConfigPath = __DIR__ . "/../../config/mail.example.php";
}

$mailConfig = require $mailConfigPath;

$mail = new PHPMailer(true);

try {
    $mail->SMTPDebug = 0;
    $mail->isSMTP();
    $mail->CharSet = "UTF-8";

    $host = (string)($mailConfig["host"] ?? "");
    $username = (string)($mailConfig["username"] ?? "");
    $password = (string)($mailConfig["password"] ?? "");
    $port = (int)($mailConfig["port"] ?? 587);

    $mail->Host = $host;
    $mail->Port = $port;

    // Auth/TLS opcional (para que funcione en Docker con MailHog sin credenciales)
    $authEnv = envFlag('SMTP_AUTH');
    $secureEnv = normalizeSecure(envFlag('SMTP_SECURE'));

    $smtpAuth = ($authEnv !== null)
        ? normalizeAuth($authEnv)
        : (trim($username) !== '' || trim($password) !== '');

    $mail->SMTPAuth = $smtpAuth;
    if ($smtpAuth) {
        $mail->Username = $username;
        $mail->Password = $password;
    }

    if ($secureEnv === 'tls') {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    } elseif ($secureEnv === 'ssl') {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    } else {
        $mail->SMTPSecure = false;
        $mail->SMTPAutoTLS = false;
    }

    $from = envFlag('MAIL_FROM');
    if (!is_string($from) || trim($from) === '') {
        $from = (trim($username) !== '') ? $username : 'no-reply@btsecho.local';
    }

    $mail->setFrom($from, "BTS Echo 💜");
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
        "message" => "Si el correo existe, te enviaremos un enlace de recuperación 💜"
    ]);
} catch (Exception $e) {
    http_response_code(500);
    $payload = [
        "success" => false,
        "message" => "No se pudo enviar el correo. Intenta más tarde."
    ];

    if (getenv("APP_DEBUG") === "1") {
        $payload["debug"] = $mail->ErrorInfo;
    }

    echo json_encode($payload);
}
