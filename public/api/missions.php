<?php
// Archivo: public/api/missions.php — Propósito: listar misiones; si hay sesión, incluye status/proof/completed_at desde user_missions.
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

require_once __DIR__ . '/_api.php';
api_bootstrap(true);

// WHY: api_bootstrap/api_ok/api_fail keep JSON output consistent across endpoints.

require_once __DIR__ . "/../../config/database.php";

api_require_method('GET');

try {
    $userId = (int)(api_optional_user_id() ?? 0);

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

    api_ok([
        "missions" => $missions
    ]);
} catch (Exception $e) {
    api_fail(500, "Error interno del servidor", ["missions" => []]);
}
