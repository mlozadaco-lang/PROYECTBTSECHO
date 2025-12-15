<?php
require_once __DIR__ . '/_api.php';
api_bootstrap(true);

// WHY: keep session endpoint minimal and consistent.

if (isset($_SESSION["user_id"])) {
    api_ok([
        "logged" => true,
        "user" => [
            "name" => $_SESSION["name"],
            "email" => $_SESSION["email"]
        ]
    ]);
} else {
    api_ok([
        "logged" => false
    ]);
}
