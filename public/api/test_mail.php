<?php
require_once __DIR__ . "/../../lib/PHPMailer/Exception.php";
require_once __DIR__ . "/../../lib/PHPMailer/PHPMailer.php";
require_once __DIR__ . "/../../lib/PHPMailer/SMTP.php";

use PHPMailer\PHPMailer\PHPMailer;

$mailConfig = require __DIR__ . "/../../config/mail.php";

$mail = new PHPMailer(true);
$mail->SMTPDebug = 2;
$mail->isSMTP();
$mail->Host = $mailConfig["host"];
$mail->SMTPAuth = true;
$mail->Username = $mailConfig["username"];
$mail->Password = $mailConfig["password"];
$mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
$mail->Port = 587;

$mail->setFrom($mailConfig["username"], "BTS Echo");
$mail->addAddress($mailConfig["username"]);
$mail->Subject = "Test correo";
$mail->Body = "Correo de prueba";

$mail->send();
echo "Correo enviado OK";
