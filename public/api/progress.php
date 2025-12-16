<?php
// Archivo: public/api/progress.php — Propósito: devolver progreso del usuario (nivel/XP) y asegurar fila en user_progress.
/**
 * Endpoint: GET /api/progress.php
 *
 * Qué hace (MVP):
 * - Devuelve el progreso del usuario (nivel y experiencia) desde `user_progress`.
 * - Si la fila no existe (usuarios antiguos), la crea con valores por defecto.
 */

require_once __DIR__ . '/_api.php';
api_bootstrap(true);

require_once __DIR__ . "/../../config/database.php";

api_require_method('GET');

$userId = api_require_login("Debes iniciar sesión.");

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

    api_ok([
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
    api_fail(500, "Error interno del servidor");
}
