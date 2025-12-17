<?php
// Archivo: public/api/_db.php — Propósito: acceso centralizado a PDO ($pdo) para endpoints API.
// Nota: esto actúa como parte del “mini-framework” del backend: reduce repetición y estandariza fallos.

declare(strict_types=1);

require_once __DIR__ . '/_api.php';

/**
 * Devuelve una instancia PDO reutilizable.
 *
 * Requiere que config/database.php defina $pdo.
 */
function api_db(): PDO {
  static $pdoInstance = null;
  if ($pdoInstance instanceof PDO) return $pdoInstance;

  // config/database.php crea $pdo (variable) en este scope.
  require __DIR__ . '/../../config/database.php';

  if (!isset($pdo) || !($pdo instanceof PDO)) {
    api_fail(500, 'Error de conexión');
  }

  $pdoInstance = $pdo;
  return $pdoInstance;
}
