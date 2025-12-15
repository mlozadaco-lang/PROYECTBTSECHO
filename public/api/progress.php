<?php
/**
 * Endpoint: GET /api/progress.php
 *
 * Qué hace (MVP):
 * - Devuelve el progreso del usuario (nivel y experiencia) desde `user_progress`.
 * - Si la fila no existe (usuarios antiguos), la crea con valores por defecto.
 */

header("Content-Type: application/json; charset=utf-8");
session_start();

require_once __DIR__ . "/../../config/database.php";

if (!isset($_SESSION["user_id"])) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "Debes iniciar sesión."
    ]);
    exit;
}

$userId = (int)$_SESSION["user_id"];

// Regla simple y fácil de entender:
// cada 20 XP subes 1 nivel.
$xpPerLevel = 20;

try {
    // Asegura que exista user_progress (por compatibilidad con usuarios ya creados).
    $stmt = $pdo->prepare("INSERT IGNORE INTO user_progress (user_id, level, experience) VALUES (?, 1, 0)");
    $stmt->execute([$userId]);

    $stmt = $pdo->prepare("SELECT level, experience FROM user_progress WHERE user_id = ? LIMIT 1");
    $stmt->execute([$userId]);
    $progress = $stmt->fetch(PDO::FETCH_ASSOC);

    $level = (int)($progress["level"] ?? 1);
    $experience = (int)($progress["experience"] ?? 0);

    // Datos derivados (para mostrar en UI si se quiere)
    $xpIntoLevel = $experience % $xpPerLevel;
    $xpToNextLevel = $xpPerLevel - $xpIntoLevel;
    $nextLevelAtTotalXp = $level * $xpPerLevel;

    echo json_encode([
        "success" => true,
        "progress" => [
            "level" => $level,
            "experience" => $experience,
            "xp_per_level" => $xpPerLevel,
            "xp_into_level" => $xpIntoLevel,
            "xp_to_next_level" => $xpToNextLevel,
            "next_level_at_total_xp" => $nextLevelAtTotalXp
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error interno del servidor"
    ]);
}
