<?php

/**
 * BTS Echo — API helpers (shared)
 *
 * WHY:
 * - Most endpoints repeated the same boilerplate: JSON headers, session_start, reading JSON body,
 *   and emitting error responses.
 * - Centralizing that logic keeps endpoints shorter and easier to read, while keeping responses consistent.
 */

declare(strict_types=1);

function api_bootstrap(bool $startSession = true): void {
  header('Content-Type: application/json; charset=utf-8');

  if ($startSession && session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
  }
}

function api_json(array $payload, int $statusCode = 200): void {
  http_response_code($statusCode);
  echo json_encode($payload);
  exit;
}

function api_fail(int $statusCode, string $message, array $extra = []): void {
  api_json(array_merge(['success' => false, 'message' => $message], $extra), $statusCode);
}

function api_ok(array $payload = [], int $statusCode = 200): void {
  api_json(array_merge(['success' => true], $payload), $statusCode);
}

function api_read_json_body(): array {
  $raw = file_get_contents('php://input');
  if ($raw === false) return [];

  $raw = trim($raw);
  if ($raw === '') return [];

  $data = json_decode($raw, true);
  // WHY: keep endpoints robust if body is empty or invalid JSON.
  return is_array($data) ? $data : [];
}

function api_require_login(string $message = 'Debes iniciar sesión.'): int {
  if (!isset($_SESSION['user_id'])) {
    api_fail(401, $message);
  }

  return (int)$_SESSION['user_id'];
}

function api_require_method(string $method): void {
  $want = strtoupper($method);
  $got = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

  if ($got !== $want) {
    api_fail(405, 'Método no permitido');
  }
}
