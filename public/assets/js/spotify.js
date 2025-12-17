// Archivo: public/assets/js/spotify.js — Propósito: cargar Top BTS desde Spotify (API) y registrar clics a links de Spotify (tracking).
(function () {
  const api = window.BtsEchoApi;
  const btsListEl = document.getElementById('spotifyBtsTopList');
  const viewEl = document.getElementById('musicTopView');
  const viewWeeklyEl = document.getElementById('musicTopWeeklyClicks');
  const viewBtsEl = document.getElementById('musicTopBts');

  if (!btsListEl) return;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function isFileProtocol() {
    return !!(api && api.isFileProtocol && api.isFileProtocol());
  }

  async function requestJson(url, options) {
    // WHY: unify JSON parsing/error handling across the project (api.js)
    if (api && api.requestJson) return api.requestJson(url, options);

    const res = await fetch(url, options);
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  }

  async function loadBtsTop() {
    btsListEl.textContent = 'Cargando Top BTS desde Spotify...';

    if (isFileProtocol()) {
      btsListEl.textContent = 'Disponible al abrir por http://localhost:8000/';
      return;
    }

    const market = getSpotifyMarket();

    try {
      const url = `/api/spotify-bts-top.php?limit=10&market=${encodeURIComponent(market)}`;

      const result = await requestJson(url, { credentials: 'include' });

      const data = result && result.data ? result.data : null;
      if (!result || !result.ok || !data || !data.success) {
        const message = (data && data.message) ? data.message : 'No disponible.';
        btsListEl.textContent = message;
        return;
      }

      const items = Array.isArray(data.items) ? data.items : [];
      if (items.length === 0) {
        btsListEl.textContent = 'Spotify no devolvió tracks.';
        return;
      }

      btsListEl.innerHTML = items.map((t, idx) => {
        const title = t.name || 'Track';
        const artists = Array.isArray(t.artists) ? t.artists.join(', ') : '';
        const url = t.spotify_url || '#';
        const trackId = t.id || '';

        return `
          <div class="music-top-item">
            <div class="music-top-rank">${idx + 1}</div>
            <div class="music-top-info">
              <div class="music-top-title">${escapeHtml(title)}</div>
              <div class="music-top-meta">${escapeHtml(artists)}</div>
            </div>
            <a class="music-top-link" 
               data-spotify-url="${escapeHtml(url)}"
               data-spotify-track-id="${escapeHtml(trackId)}"
               data-track-name="${escapeHtml(title)}"
               data-artists="${escapeHtml(artists)}"
               data-context="bts_top"
               href="${url}" target="_blank" rel="noreferrer">Abrir</a>
          </div>
        `;
      }).join('');
    } catch (e) {
      btsListEl.textContent = 'Error cargando Top BTS.';
    }
  }

  function reportSpotifyClick(payload) {
    try {
      const body = JSON.stringify(payload || {});
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon('/api/spotify-click.php', blob);
        return;
      }

      // WHY: keepalive + consistent JSON headers, but don't block navigation.
      if (api && api.postJson) {
        api.postJson('/api/spotify-click.php', payload || {}, { keepalive: true, credentials: 'include' }).catch(() => {});
        return;
      }

      fetch('/api/spotify-click.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
        credentials: 'include'
      }).catch(() => {});
    } catch (_) {}
  }

  function shouldReportOncePerSecond(a) {
    if (!a || !a.getAttribute) return true;
    const now = Date.now();
    const raw = a.getAttribute('data-click-reported-at');
    const last = raw ? Number(raw) : 0;
    if (Number.isFinite(last) && last > 0 && (now - last) < 1000) return false;
    a.setAttribute('data-click-reported-at', String(now));
    return true;
  }

  function handleLinkClick(e) {
    const a = e.target && e.target.closest ? e.target.closest('a.music-top-link') : null;
    if (!a) return;
    const url = a.getAttribute('data-spotify-url') || a.href || '';
    if (!url || url === '#') return;

    // Only track real Spotify links (avoid sending for internal buttons like "Conectar Spotify")
    const lower = String(url).toLowerCase();
    if (!lower.startsWith('https://open.spotify.com/') && !lower.startsWith('http://open.spotify.com/')) return;

    if (!shouldReportOncePerSecond(a)) return;

    reportSpotifyClick({
      spotify_url: url,
      spotify_track_id: a.getAttribute('data-spotify-track-id') || '',
      track_name: a.getAttribute('data-track-name') || '',
      artists: a.getAttribute('data-artists') || '',
      context: a.getAttribute('data-context') || 'unknown'
    });
  }

  // Use pointerdown so the request starts before navigation; keep click as a fallback.
  btsListEl.addEventListener('pointerdown', handleLinkClick);
  btsListEl.addEventListener('click', handleLinkClick);
  function getSpotifyMarket() {
    // Spotify market is a 2-letter country code.
    // Try to infer from browser locale (e.g., es-PE -> PE). Fallback to US.
    const locale = (navigator.languages && navigator.languages[0]) ? navigator.languages[0] : navigator.language;
    const raw = typeof locale === 'string' ? locale : '';
    const parts = raw.replace('_', '-').split('-');
    const region = parts.length >= 2 ? parts[1] : '';
    if (region && /^[A-Za-z]{2}$/.test(region)) return region.toUpperCase();
    return 'US';
  }

  function setHidden(el, hidden) {
    if (!el) return;
    if (hidden) {
      el.classList.add('hidden');
      el.style.display = 'none';
    } else {
      el.classList.remove('hidden');
      el.style.display = '';
    }
  }

  function applyMusicTopView() {
    if (!viewEl) return;
    const v = String(viewEl.value || 'weekly_clicks');
    setHidden(viewWeeklyEl, v !== 'weekly_clicks');
    setHidden(viewBtsEl, v !== 'bts_spotify');
    if (v === 'bts_spotify') loadBtsTop();
  }

  if (viewEl) {
    viewEl.addEventListener('change', applyMusicTopView);
    applyMusicTopView();
  }

  // Initial load
  if (!viewEl) {
    loadBtsTop();
  }
})();
