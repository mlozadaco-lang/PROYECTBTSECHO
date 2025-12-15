let hoverAudioBlocked = false;
let currentAudio = null;

function getPersistedTopPlayerVolume() {
    try {
        const raw = localStorage.getItem("btsecho.topPlayer.state");
        const st = raw ? JSON.parse(raw) : null;
        const v = st && typeof st.volume === "number" ? st.volume : null;
        return (typeof v === "number") ? Math.max(0, Math.min(1, v)) : null;
    } catch {
        return null;
    }
}

function openSpotifyBubble(spotifyUrl) {
    const bubble = document.getElementById("playerBubble");
    const frame = document.getElementById("spotifyFrame");
    if (!bubble || !frame || !spotifyUrl) return;

    const parts = String(spotifyUrl).split("/track/");
    const trackId = parts.length > 1 ? String(parts[1]).split("?")[0] : "";
    if (!trackId) return;

    hoverAudioBlocked = true;
    frame.src = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`;
    bubble.classList.remove("hidden");
}

document.querySelectorAll(".char-btn").forEach((btn, i) => {
    const data = (typeof members !== "undefined" && Array.isArray(members)) ? members[i] : null;
    if (!data) return;

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

        if (currentAudio && currentAudio !== audio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }

        audio.currentTime = 0;
        audio.play();
        currentAudio = audio;
    });

    btn.addEventListener("click", () => {
        if (window.btsEchoTopPlayer && typeof window.btsEchoTopPlayer.loadAndPlay === "function") {
            window.btsEchoTopPlayer.loadAndPlay(i);
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
});

const closeBubbleBtn = document.getElementById("closeBubble");
if (closeBubbleBtn) {
    closeBubbleBtn.addEventListener("click", () => {
        const bubble = document.getElementById("playerBubble");
        const frame = document.getElementById("spotifyFrame");
        if (frame) frame.src = "";
        if (bubble) bubble.classList.add("hidden");
        hoverAudioBlocked = false;
    });
}

const echoBtn = document.getElementById("enterEchoVerse");
if (echoBtn) echoBtn.addEventListener("click", () => { window.location.href = "echoverse/index.html"; });

const missionBtn = document.getElementById("enterMissionMode");
if (missionBtn) missionBtn.addEventListener("click", () => { window.location.href = "missions/index.html"; });
