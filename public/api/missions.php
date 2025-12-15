<?php
/**
 * Endpoint: GET /api/missions.php
 *
 * Qué hace:
 * - Devuelve la lista de misiones desde `missions`.
 * - Si hay usuario logueado (sesión), también devuelve el `status` por misión
 *   usando `user_missions`.
 *
 * Nota: esto permite que el front muestre "Pendiente" / "Completada".
 */

header("Content-Type: application/json; charset=utf-8");
session_start();

require_once __DIR__ . "/../../config/database.php";

try {
    $userId = isset($_SESSION["user_id"]) ? (int)$_SESSION["user_id"] : 0;

    if ($userId > 0) {
        // Usuario logueado: devolvemos el status desde user_missions
        $stmt = $pdo->prepare("
            SELECT
                m.id,
                m.title,
                m.description,
                m.reward_xp,
                COALESCE(um.status, 'pending') AS status,
                um.proof,
                um.completed_at
            FROM missions m
            LEFT JOIN user_missions um
              ON um.mission_id = m.id
             AND um.user_id = ?
            ORDER BY m.id DESC
            LIMIT 50
        ");
        $stmt->execute([$userId]);
        $missions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } else {
        // Sin sesión: todo queda en pending
        $stmt = $pdo->query("
            SELECT
                id,
                title,
                description,
                reward_xp,
                'pending' AS status,
                NULL AS proof,
                NULL AS completed_at
            FROM missions
            ORDER BY id DESC
            LIMIT 50
        ");
        $missions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    echo json_encode([
        "success" => true,
        "missions" => $missions
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error interno del servidor",
        "missions" => []
    ]);
}
