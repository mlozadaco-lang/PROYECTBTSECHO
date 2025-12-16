// Archivo: public/assets/js/script.js — Propósito: lógica principal del Portal (personajes, audio hover, burbuja Spotify embed y navegación).
let hoverAudioBlocked = false;
let currentAudio = null;

const byId = (id) => document.getElementById(id);

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function safeJsonParse(raw) {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function getPersistedTopPlayerVolume() {
    const raw = localStorage.getItem("btsecho.topPlayer.state");
    const st = raw ? safeJsonParse(raw) : null;
    const v = st && typeof st.volume === "number" ? st.volume : null;
    return (typeof v === "number") ? clamp(v, 0, 1) : null;
}

function getSpotifyTrackIdFromUrl(spotifyUrl) {
    const parts = String(spotifyUrl || "").split("/track/");
    return parts.length > 1 ? String(parts[1]).split("?")[0] : "";
}

function setSpotifyBubbleOpen(spotifyTrackId) {
    const bubble = byId("playerBubble");
    const frame = byId("spotifyFrame");
    if (!bubble || !frame || !spotifyTrackId) return;

    hoverAudioBlocked = true;
    frame.src = `https://open.spotify.com/embed/track/${spotifyTrackId}?utm_source=generator&theme=0`;
    bubble.classList.remove("hidden");
}

function setSpotifyBubbleClosed() {
    const bubble = byId("playerBubble");
    const frame = byId("spotifyFrame");
    if (frame) frame.src = "";
    if (bubble) bubble.classList.add("hidden");
    hoverAudioBlocked = false;
}

function openSpotifyBubble(spotifyUrl) {
    if (!spotifyUrl) return;
    const trackId = getSpotifyTrackIdFromUrl(spotifyUrl);
    if (!trackId) return;
    setSpotifyBubbleOpen(trackId);
}

function stopCurrentHoverAudio(newAudio) {
    if (currentAudio && currentAudio !== newAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }
}

function wireCharacterButton(btn, index, data) {
    const audio = new Audio(data.mp3);
    const persistedVolume = getPersistedTopPlayerVolume();
    if (persistedVolume != null) audio.volume = persistedVolume;

    btn.innerHTML = `
        <div class="char-inner" style="position: relative;">
            <img src="${data.img}" class="char-img">
            <div class="char-icons-inline">
                <span class="char-audio-icon spotify-icon">🎧</span>
                <span class="char-youtube-icon">▶️</span>
            </div>
        </div>
        <div class="char-label">
            <strong>${data.name}</strong>
            ${data.track}
        </div>
    `;

    const spotifyIcon = btn.querySelector(".spotify-icon");
    const youtubeIcon = btn.querySelector(".char-youtube-icon");

    btn.addEventListener("mouseenter", () => {
        if (window.btsEchoTopPlayer && typeof window.btsEchoTopPlayer.isPlaying === "function" && window.btsEchoTopPlayer.isPlaying()) return;
        if (hoverAudioBlocked) return;

        stopCurrentHoverAudio(audio);

        audio.currentTime = 0;
        audio.play();
        currentAudio = audio;
    });

    btn.addEventListener("click", () => {
        if (window.btsEchoTopPlayer && typeof window.btsEchoTopPlayer.loadAndPlay === "function") {
            window.btsEchoTopPlayer.loadAndPlay(index);
        }
    });

    btn.addEventListener("mouseleave", () => {
        audio.pause();
        audio.currentTime = 0;
        if (currentAudio === audio) currentAudio = null;
    });

    if (spotifyIcon) {
        spotifyIcon.addEventListener("click", (event) => {
            event.stopPropagation();
            openSpotifyBubble(data.spotify);
        });
    }

    if (youtubeIcon) {
        youtubeIcon.addEventListener("click", (event) => {
            event.stopPropagation();
            window.open(data.youtube, "_blank");
        });
    }
}

function wireCharacters() {
    const list = (typeof members !== "undefined" && Array.isArray(members)) ? members : [];
    document.querySelectorAll(".char-btn").forEach((btn, i) => {
        const data = list[i];
        if (!data) return;
        wireCharacterButton(btn, i, data);
    });
}

wireCharacters();

const closeBubbleBtn = document.getElementById("closeBubble");
if (closeBubbleBtn) {
    closeBubbleBtn.addEventListener("click", () => {
        setSpotifyBubbleClosed();
    });
}

const echoBtn = document.getElementById("enterEchoVerse");
if (echoBtn) echoBtn.addEventListener("click", () => { window.location.href = "echoverse/index.html"; });

const missionBtn = document.getElementById("enterMissionMode");
if (missionBtn) missionBtn.addEventListener("click", () => { window.location.href = "missions/index.html"; });
