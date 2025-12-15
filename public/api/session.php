<?php
session_start();

if (isset($_SESSION["user_id"])) {
    echo json_encode([
        "logged" => true,
        "user" => [
            "name" => $_SESSION["name"],
            "email" => $_SESSION["email"]
        ]
    ]);
} else {
    echo json_encode([
        "logged" => false
    ]);
}
