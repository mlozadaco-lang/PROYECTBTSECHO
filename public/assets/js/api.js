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
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      // WHY: some endpoints might echo warnings/errors; returning null avoids hard crashes.
      return null;
    }
  }

  async function requestJson(url, opts) {
    const res = await fetch(url, {
      headers: { Accept: "application/json", ...(opts && opts.headers ? opts.headers : {}) },
      ...opts,
    });

    const data = await readJsonSafe(res);
    return { ok: res.ok, status: res.status, data };
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
