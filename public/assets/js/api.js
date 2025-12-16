// Archivo: public/assets/js/api.js — Propósito: helper compartido para requests JSON (fetch + headers + parse) expuesto como window.BtsEchoApi.
/*
  BTS Echo — API helper (shared)

  WHY:
  - We had multiple copies of fetch/post JSON helpers across files (missions.js, theme.js, auth.js...).
  - Centralizing them reduces duplicated code and makes behavior consistent (Accept header, JSON parsing).

  This file intentionally attaches a small helper object to window because this project is plain HTML/JS
  (no bundler). Keep the surface area tiny.
*/

(function () {
  function isFileProtocol() {
    return location.protocol === "file:";
  }

  async function readJsonSafe(res) {
    const text = await res.text();
    if (!text) return { data: null, rawText: "" };
    try {
      return { data: JSON.parse(text), rawText: text };
    } catch {
      // WHY: some endpoints might echo warnings/errors; keep rawText for debugging previews.
      return { data: null, rawText: text };
    }
  }

  async function requestJson(url, opts) {
    const abs = new URL(url, location.href);
    const isApiCall = abs.origin === location.origin && abs.pathname.startsWith("/api/");
    const token = isApiCall
      ? (window.__BtsEchoAuthToken || localStorage.getItem("btsecho_auth_token"))
      : null;

    const mergedHeaders = {
      ...(opts && opts.headers ? opts.headers : {}),
      Accept: "application/json",
    };

    if (isApiCall && token && !mergedHeaders.Authorization) {
      mergedHeaders.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      ...(opts || {}),
      credentials: "same-origin",
      cache: "no-store",
      headers: mergedHeaders,
    });

    const parsed = await readJsonSafe(res);
    return { ok: res.ok, status: res.status, data: parsed.data, rawText: parsed.rawText };
  }

  function assertHttp(message) {
    if (isFileProtocol()) {
      throw new Error(message || "Abre el sitio por http://localhost para usar /api/*");
    }
  }

  async function postJson(url, payload, opts) {
    return requestJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(opts && opts.headers ? opts.headers : {}) },
      body: JSON.stringify(payload || {}),
      ...opts,
    });
  }

  window.BtsEchoApi = {
    isFileProtocol,
    assertHttp,
    requestJson,
    postJson,
  };
})();
