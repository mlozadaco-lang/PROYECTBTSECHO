<?php

// Example mail configuration for PHPMailer.
// Copy to config/mail.php (which is gitignored) or set env vars.

return [
    "host" => getenv("SMTP_HOST") ?: "smtp.example.com",
    "username" => getenv("SMTP_USERNAME") ?: "",
    "password" => getenv("SMTP_PASSWORD") ?: "",
    "port" => getenv("SMTP_PORT") ?: "587",
];
