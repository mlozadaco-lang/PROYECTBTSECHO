// Archivo: public/assets/js/weekly-spotify-top.js — Propósito: render del “Top semanal (clics Spotify)” consumiendo /api/spotify-clicks-top-weekly.php.
/*
  BTS Echo — Top semanal (clics Spotify)

  WHY:
  - Esto vivía dentro de player.js (reproductor local) y lo hacía muy largo.
  - Separarlo deja cada archivo con una sola responsabilidad.

  UX: mantiene exactamente los mismos textos y clases CSS.
*/

(function () {
  const container = document.getElementById("weeklySpotifyClicksList");
  if (!container) return;

  const musicTopViewEl = document.getElementById("musicTopView");

  async function refreshWeeklySpotifyClicksTop() {
    if (window.BtsEchoApi?.isFileProtocol && window.BtsEchoApi.isFileProtocol()) {
      container.textContent = "Disponible al abrir por http://localhost:8000/";
      return;
    }

    try {
      const api = window.BtsEchoApi;
      const url = "/api/spotify-clicks-top-weekly.php?limit=7";

      // WHY: evitar duplicar fetch + parse JSON + preview cuando no es JSON.
      const result = api?.requestJson
        ? await api.requestJson(url)
        : await fetch(url, { headers: { Accept: "application/json" } }).then(async (res) => ({
            ok: res.ok,
            status: res.status,
            data: await res.json().catch(() => null),
            rawText: "",
          }));

      const data = result?.data;
      if (!data) {
        const preview = String(result?.rawText || "").trim().slice(0, 160);
        container.textContent = `Error (${result?.status || 0}). ${preview || "Respuesta no JSON."}`;
        return;
      }

      if (!data?.success || !Array.isArray(data.items)) {
        const msg = (data && typeof data.message === "string" && data.message.trim())
          ? data.message.trim()
          : "No se pudo cargar el top.";
        container.textContent = msg;
        return;
      }

      const items = data.items;
      if (items.length === 0) {
        container.textContent = "Aún no hay clics registrados esta semana.";
        return;
      }

      container.innerHTML = "";
      items.forEach((it, idx) => {
        const row = document.createElement("div");
        row.className = "music-top-item";

        const left = document.createElement("div");
        left.className = "music-top-left";

        const title = document.createElement("div");
        title.className = "music-top-title";
        title.textContent = `${idx + 1}. ${(it.track_name || "Track").trim()}`;

        const sub = document.createElement("div");
        sub.className = "music-top-sub";
        const artists = (it.artists || "").trim();
        const clicks = Number(it.clicks || 0);
        sub.textContent = `${artists}${artists ? " • " : ""}${clicks} clics (7 días)`;

        left.appendChild(title);
        left.appendChild(sub);
        row.appendChild(left);

        const url2 = (it.spotify_url || "").trim();
        if (url2) {
          const a = document.createElement("a");
          a.className = "music-top-link";
          a.href = url2;
          a.target = "_blank";
          a.rel = "noreferrer";
          a.textContent = "Abrir";

          row.appendChild(a);
        }

        container.appendChild(row);
      });
    } catch {
      container.textContent = "No se pudo cargar el top.";
    }
  }

  // Load weekly top only when visible
  if (!musicTopViewEl || String(musicTopViewEl.value || "weekly_clicks") === "weekly_clicks") {
    refreshWeeklySpotifyClicksTop();
  }

  if (musicTopViewEl) {
    musicTopViewEl.addEventListener("change", () => {
      if (String(musicTopViewEl.value || "") === "weekly_clicks") {
        refreshWeeklySpotifyClicksTop();
      }
    });
  }
})();
