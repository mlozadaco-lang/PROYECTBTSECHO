<?php
session_start();

header("Content-Type: application/json; charset=utf-8");

if (isset($_SESSION["user_id"])) {
    echo json_encode([
        "success" => true,
        "logged" => true,
        "user" => [
            "name" => $_SESSION["name"],
            "email" => $_SESSION["email"]
        ]
    ]);
} else {
    echo json_encode([
        "success" => true,
        "logged" => false
    ]);
}
