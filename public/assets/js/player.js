// Archivo: public/assets/js/player.js — Propósito: reproductor superior de audio local (Prev/Play/Next/Seek/Vol) + persistencia en localStorage.
/* ============================================================
   BTS Echo — Reproductor superior (audio local)
   - Play/Pause, Prev/Next, Seek, Volumen
   - Persiste: volumen, pista actual, segundo actual
   - Nota: por políticas del navegador no se auto-reproduce al recargar.
============================================================ */

(function () {
    const byId = (id) => document.getElementById(id);

    const audio = byId("tmpAudio");
    const titleEl = byId("tmpTitle");
    const metaEl = byId("tmpMeta");

    const btnPrev = byId("tmpPrev");
    const btnPlay = byId("tmpPlay");
    const btnNext = byId("tmpNext");

    const seek = byId("tmpSeek");
    const vol = byId("tmpVolume");
    const timeEl = byId("tmpTime");

    if (!audio || !titleEl || !metaEl || !btnPlay || !seek || !vol || !timeEl) {
        return;
    }

    const STORAGE_KEY = "btsecho.topPlayer.state";

    function parseJson(raw) {
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    function clamp(n, min, max) {
        return Math.max(min, Math.min(max, n));
    }

    function formatTime(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${String(s).padStart(2, "0")}`;
    }

    function getMembersList() {
        // Reutilizamos members.js como fuente de datos.
        // OJO: `const members = [...]` NO necesariamente existe como `window.members`.
        // En scripts clásicos, `members` es un binding global, pero no una propiedad de window.
        if (Array.isArray(window.members) && window.members.length) return window.members;
        if (typeof members !== "undefined" && Array.isArray(members)) return members;
        return [];
    }

    function getTracks() {
        const list = getMembersList();

        if (!Array.isArray(list) || list.length === 0) return [];

        return list
            .map((m, idx) => ({
                index: idx,
                name: String((m && m.name) ? m.name : "Pista"),
                track: String((m && m.track) ? m.track : ""),
                src: String((m && m.mp3) ? m.mp3 : ""),
            }))
            .filter(t => !!t.src);
    }

    const tracks = getTracks();
    let currentIndex = 0;
    let isSeekDragging = false;
    let lastSavedAt = 0;
    // Nota: el tracking de escuchas locales fue removido.

    function hasTracks() {
        return Array.isArray(tracks) && tracks.length > 0;
    }

    function loadState() {
        const raw = localStorage.getItem(STORAGE_KEY);
        const state = parseJson(raw) || {};

        const volValue = typeof state.volume === "number" ? clamp(state.volume, 0, 1) : 0.8;
        vol.value = String(volValue);
        audio.volume = volValue;

        const idx = typeof state.trackIndex === "number" ? state.trackIndex : 0;
        currentIndex = clamp(idx, 0, Math.max(0, tracks.length - 1));

        return {
            savedTime: typeof state.currentTime === "number" ? Math.max(0, state.currentTime) : 0,
        };
    }

    function saveState() {
        const state = {
            volume: audio.volume,
            trackIndex: currentIndex,
            currentTime: audio.currentTime,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function stopHoverAudioIfAny() {
        // script.js define currentAudio y hoverAudioBlocked.
        if (typeof currentAudio === "undefined") return;
        if (!currentAudio) return;
        try {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        } finally {
            currentAudio = null;
        }
    }

    function setHoverBlocked(value) {
        if (typeof hoverAudioBlocked === "undefined") return;
        hoverAudioBlocked = !!value;
    }

    function updateUi() {
        const t = tracks[currentIndex];
        if (!t) {
            titleEl.textContent = "Reproductor";
            metaEl.textContent = "No hay pistas disponibles";
            btnPlay.textContent = "▶";
            timeEl.textContent = "0:00 / 0:00";
            seek.value = "0";
            return;
        }

        titleEl.textContent = t.name;
        metaEl.textContent = t.track ? `Track: ${t.track}` : "";

        btnPlay.textContent = audio.paused ? "▶" : "⏸";

        const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
        const cur = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
        timeEl.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;

        if (!isSeekDragging && dur > 0) {
            seek.value = String((cur / dur) * 100);
        }
    }

    function loadTrack(index, opts = {}) {
        if (!hasTracks()) return;

        currentIndex = clamp(index, 0, tracks.length - 1);
        const t = tracks[currentIndex];

        audio.src = t.src;
        audio.load();

        // Importante: setear el tiempo solo cuando exista metadata
        const wantedTime = typeof opts.startTime === "number" ? opts.startTime : 0;
        const shouldPlay = !!opts.autoplay;

        const onMeta = () => {
            audio.removeEventListener("loadedmetadata", onMeta);
            if (Number.isFinite(audio.duration) && audio.duration > 0) {
                audio.currentTime = clamp(wantedTime, 0, Math.max(0, audio.duration - 0.25));
            }
            updateUi();
            if (shouldPlay) {
                audio.play().catch(() => {
                    // Autoplay bloqueado: el usuario debe presionar Play
                });
            }
        };

        audio.addEventListener("loadedmetadata", onMeta);
        updateUi();
        saveState();
    }

    function playPause() {
        if (!hasTracks()) return;

        if (audio.paused) {
            stopHoverAudioIfAny();
            setHoverBlocked(true);
            audio.play().catch(() => {
                // bloqueado por navegador
            });
        } else {
            audio.pause();
            setHoverBlocked(false);
        }
        updateUi();
        saveState();
    }

    function prev() {
        if (!hasTracks()) return;
        const nextIndex = (currentIndex - 1 + tracks.length) % tracks.length;
        loadTrack(nextIndex, { startTime: 0, autoplay: !audio.paused });
    }

    function next() {
        if (!hasTracks()) return;
        const nextIndex = (currentIndex + 1) % tracks.length;
        loadTrack(nextIndex, { startTime: 0, autoplay: !audio.paused });
    }

    // Eventos UI
    btnPlay.addEventListener("click", playPause);
    if (btnPrev) btnPrev.addEventListener("click", prev);
    if (btnNext) btnNext.addEventListener("click", next);

    vol.addEventListener("input", () => {
        const v = clamp(Number(vol.value), 0, 1);
        audio.volume = v;
        saveState();
    });

    seek.addEventListener("input", () => {
        isSeekDragging = true;
        updateUi();
    });

    seek.addEventListener("change", () => {
        const pct = clamp(Number(seek.value), 0, 100);
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
            audio.currentTime = (pct / 100) * audio.duration;
        }
        isSeekDragging = false;
        saveState();
        updateUi();
    });

    audio.addEventListener("timeupdate", () => {
        const now = Date.now();
        if (now - lastSavedAt > 2000) {
            lastSavedAt = now;
            saveState();
        }

        updateUi();
    });

    audio.addEventListener("play", () => {
        setHoverBlocked(true);
        updateUi();
    });

    audio.addEventListener("pause", () => {
        setHoverBlocked(false);
        updateUi();
    });

    audio.addEventListener("ended", () => {
        // Si ya hubo interacción, normalmente el siguiente autoplay sí funciona.
        next();
    });

    // API pública para integrarlo con los personajes
    window.btsEchoTopPlayer = {
        loadAndPlay: (index) => {
            // Si es la misma pista, solo toggle play
            if (Number(index) === currentIndex && audio.src) {
                playPause();
                return;
            }
            loadTrack(Number(index), { startTime: 0, autoplay: true });
        },
        loadOnly: (index) => {
            loadTrack(Number(index), { startTime: 0, autoplay: false });
        },
        getVolume: () => audio.volume,
        isPlaying: () => !audio.paused,
    };

    // Init
    const { savedTime } = loadState();
    if (hasTracks()) {
        loadTrack(currentIndex, { startTime: savedTime, autoplay: false });
    } else {
        updateUi();
    }

})();
