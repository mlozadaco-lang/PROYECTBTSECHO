<?php
// Archivo: public/api/complete-mission.php — Propósito: completar una misión (requiere sesión), guardar proof y sumar XP/nivel.
/**
 * Endpoint: POST /api/complete-mission.php
 *
 * Qué hace:
 * - Marca una misión como "completed" para el usuario logueado (sesión PHP).
 * - Guarda el progreso en MySQL en la tabla `user_missions`.
 *
 * Nota (para el equipo): esto es la base del "progreso real" de Misiones.
 */

require_once __DIR__ . '/_api.php';
api_bootstrap(true);

require_once __DIR__ . '/_db.php';

// WHY: reduce boilerplate (headers/session/body parsing) and keep responses consistent.


$pdo = api_db();

api_require_method('POST');

$userId = api_require_login("Debes iniciar sesión para completar misiones.");
$data = api_read_json_body();

$missionId = (int)($data["mission_id"] ?? 0);
$proof = trim((string)($data["proof"] ?? ""));
if ($missionId <= 0) {
    api_fail(400, "mission_id inválido");
}

// Anti-trampa (MVP): para completar, pedimos una “prueba” (texto o link).
// Importante: esto NO valida el mundo real (streaming real, etc.), pero evita el click vacío.
if ($proof === "" || mb_strlen($proof) < 5) {
    api_fail(400, "Agrega una prueba (texto o link) para completar la misión.");
}

// Límite simple para evitar payloads gigantes.
if (mb_strlen($proof) > 2000) {
    $proof = mb_substr($proof, 0, 2000);
}

// Regla simple y fácil de entender:
// cada 20 XP subes 1 nivel.
$xpPerLevel = 20;

// WHY: helper to rollback before returning an API error during a transaction.
$txFail = function(int $status, string $message, array $extra = [], $exception = null) use ($pdo): void {
    if ($pdo->inTransaction()) $pdo->rollBack();
    if ($exception instanceof Throwable) {
        api_fail_exception($exception, $status, $message, $extra);
    } else {
        api_fail($status, $message, $extra);
    }
};

try {
    $pdo->beginTransaction();

    // Verifica que la misión exista (evita guardar IDs inválidos)
    $stmt = $pdo->prepare("SELECT id, reward_xp FROM missions WHERE id = ? LIMIT 1");
    $stmt->execute([$missionId]);
    $mission = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$mission) {
        $txFail(404, "Misión no encontrada");
    }

    $rewardXp = (int)($mission["reward_xp"] ?? 0);

    // Asegura progreso (por compatibilidad con usuarios antiguos)
    $stmt = $pdo->prepare("INSERT IGNORE INTO user_progress (user_id, level, experience) VALUES (?, 1, 0)");
    $stmt->execute([$userId]);

    // Evita dar XP 2 veces: si ya estaba completed, solo actualizamos la prueba.
    $stmt = $pdo->prepare("SELECT status, completed_at FROM user_missions WHERE user_id = ? AND mission_id = ? LIMIT 1");
    $stmt->execute([$userId, $missionId]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    $alreadyCompleted = $existing && strtolower((string)$existing["status"]) === "completed";
    $xpAwarded = 0;

    if ($alreadyCompleted) {
        // Ya estaba completada: actualizamos la prueba, pero no sumamos XP.
        $stmt = $pdo->prepare("UPDATE user_missions SET proof = ? WHERE user_id = ? AND mission_id = ?");
        $stmt->execute([$proof, $userId, $missionId]);
    } else {
        // Primera vez que se completa: guardamos y damos XP.
        $stmt = $pdo->prepare("
            INSERT INTO user_missions (user_id, mission_id, status, proof, completed_at)
            VALUES (?, ?, 'completed', ?, NOW())
            ON DUPLICATE KEY UPDATE
                status = 'completed',
                proof = VALUES(proof),
                completed_at = NOW()
        ");
        $stmt->execute([$userId, $missionId, $proof]);

        $xpAwarded = max(0, $rewardXp);

        // Actualiza XP total y nivel
        $stmt = $pdo->prepare("SELECT experience FROM user_progress WHERE user_id = ? LIMIT 1");
        $stmt->execute([$userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        $currentXp = (int)($row["experience"] ?? 0);
        $newXp = $currentXp + $xpAwarded;
        $newLevel = (int)floor($newXp / $xpPerLevel) + 1;

        $stmt = $pdo->prepare("UPDATE user_progress SET experience = ?, level = ? WHERE user_id = ?");
        $stmt->execute([$newXp, $newLevel, $userId]);
    }

    // Leemos el progreso final para devolverlo al front
    $stmt = $pdo->prepare("SELECT level, experience FROM user_progress WHERE user_id = ? LIMIT 1");
    $stmt->execute([$userId]);
    $progress = $stmt->fetch(PDO::FETCH_ASSOC);

    $finalLevel = (int)($progress["level"] ?? 1);
    $finalXp = (int)($progress["experience"] ?? 0);

    $pdo->commit();

    api_ok([
        "message" => $alreadyCompleted ? "Misión ya estaba completada (prueba actualizada)" : "Misión completada",
        "mission_id" => $missionId,
        "status" => "completed",
        "xp_awarded" => $xpAwarded,
        "progress" => [
            "level" => $finalLevel,
            "experience" => $finalXp,
            "xp_per_level" => $xpPerLevel
        ]
    ]);
} catch (Throwable $e) {
    $txFail(500, 'Error interno del servidor', ['user_id' => $userId ?? null, 'mission_id' => $missionId ?? null], $e);
}
