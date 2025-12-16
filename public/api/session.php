<?php
// Archivo: public/api/session.php — Propósito: devolver estado de sesión (logged true/false + user básico).
require_once __DIR__ . '/_api.php';
api_bootstrap(true);

// WHY: keep session endpoint minimal and consistent.

api_require_method('GET');

$userId = api_optional_user_id();
if (!$userId) {
    api_ok(["logged" => false]);
}

// Prefer session values when available.
if (isset($_SESSION["user_id"])) {
    api_ok([
        "logged" => true,
        "user" => [
            "name" => $_SESSION["name"],
            "email" => $_SESSION["email"]
        ]
    ]);
}

// Token-based auth fallback (cookies blocked): query user.
require_once __DIR__ . "/../../config/database.php";
$stmt = $pdo->prepare("SELECT name, email FROM users WHERE id = ? LIMIT 1");
$stmt->execute([$userId]);
$u = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$u) {
    api_ok(["logged" => false]);
}

api_ok([
    "logged" => true,
    "user" => [
        "name" => $u["name"],
        "email" => $u["email"],
    ]
]);
