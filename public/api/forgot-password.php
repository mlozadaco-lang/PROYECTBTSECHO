<?php
// Archivo: public/api/forgot-password.php — Propósito: generar token de recuperación y enviar correo (PHPMailer; MailHog en Docker).
require_once __DIR__ . '/_api.php';
api_bootstrap(false);

// WHY: shared helpers (_api.php) remove repeated JSON/header/body parsing boilerplate.

require_once __DIR__ . "/../../config/database.php";

api_require_method('POST');

// PHPMailer (sin Composer)
require_once __DIR__ . "/../../lib/PHPMailer/Exception.php";
require_once __DIR__ . "/../../lib/PHPMailer/PHPMailer.php";
require_once __DIR__ . "/../../lib/PHPMailer/SMTP.php";

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

function env_string(string $key, ?string $default = null): ?string {
    $v = getenv($key);
    if ($v === false) return $default;
    $s = trim((string)$v);
    return $s === '' ? $default : $s;
}

function env_bool(string $key, bool $default = false): bool {
    $v = env_string($key);
    if ($v === null) return $default;
    $v = strtolower($v);
    return in_array($v, ['1', 'true', 'yes', 'on'], true);
}

function env_enum(string $key, array $allow, string $default): string {
    $v = strtolower((string)env_string($key, ''));
    return in_array($v, $allow, true) ? $v : $default;
}

/* =====================================================
   1. LEER EMAIL
===================================================== */

// WHY: keep compatibility with both JSON body and form POST.
$raw = api_read_raw_body();
$body = api_parse_body($raw, true);
$email = trim((string)($body["email"] ?? ($_POST["email"] ?? "")));

if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) api_fail(400, "Correo inválido.");

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
    // WHY: security/privacy — do not reveal whether the email exists.
    api_ok([
        "message" => "Si el correo existe, te enviaremos un enlace de recuperación 💜"
    ]);
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
    $hasCreds = (trim($username) !== '' || trim($password) !== '');
    $smtpAuth = env_bool('SMTP_AUTH', $hasCreds);
    $secureEnv = env_enum('SMTP_SECURE', ['tls', 'ssl'], 'none');

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

    $from = env_string('MAIL_FROM');
    if ($from === null) $from = (trim($username) !== '') ? $username : 'no-reply@btsecho.local';

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

    api_ok([
        "message" => "Si el correo existe, te enviaremos un enlace de recuperación 💜"
    ]);
} catch (Exception $e) {
    $payload = [];
    // WHY: in production we avoid leaking SMTP details; debug is opt-in via APP_DEBUG.
    if (getenv("APP_DEBUG") === "1") $payload["debug"] = $mail->ErrorInfo;
    api_fail(500, "No se pudo enviar el correo. Intenta más tarde.", $payload);
}
