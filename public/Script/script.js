/* ============================================================
   BTS Echo — LÓGICA PRINCIPAL DEL HERO
   Personajes, audio hover, Spotify mini-player y YouTube popup
   ============================================================ */

/* ------------------------------------------------------------
   Flags globales
------------------------------------------------------------ */
let hoverAudioBlocked = false;  // bloquea el hover cuando Spotify/YouTube están abiertos
let currentAudio = null;        // controla qué audio está sonando actualmente


/* ============================================================
   GENERACIÓN DINÁMICA DE PERSONAJES Y EVENTOS
============================================================ */

const btns = document.querySelectorAll(".char-btn");

btns.forEach((btn, i) => {

    const data = members[i];
    if (!data) return;

    const audio = new Audio(data.mp3);

    /* --------------------------------------------------------
       Construcción del contenido del personaje
    --------------------------------------------------------- */
    btn.innerHTML = `
        <div class="char-inner" style="position: relative;">
            <img src="${data.img}" class="char-img">

            <!-- Iconos centrados debajo del personaje -->
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

    const spotifyIcon = btn.querySelector(".char-audio-icon");
    const youtubeIcon = btn.querySelector(".char-youtube-icon");

    /* ============================================================
       EVENTO: Reproducir MP3 al pasar el mouse
    ============================================================ */
    btn.addEventListener("mouseenter", () => {

        // Si Spotify o YouTube están abiertos → no sonar
        if (hoverAudioBlocked) return;

        // Si otro audio está sonando → detenerlo
        if (currentAudio && currentAudio !== audio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }

        audio.currentTime = 0;
        audio.play();
        currentAudio = audio;
    });

    /* ============================================================
       EVENTO: Detener MP3 al salir del personaje
    ============================================================ */
    btn.addEventListener("mouseleave", () => {
        audio.pause();
        audio.currentTime = 0;

        if (currentAudio === audio) {
            currentAudio = null;
        }
    });

    /* ============================================================
       EVENTO: Abrir Spotify Bubble
    ============================================================ */
    spotifyIcon.addEventListener("click", (event) => {
        event.stopPropagation();
        openSpotifyBubble(data.spotify);
    });

    /* ============================================================
       EVENTO: Abrir YouTube en popup
    ============================================================ */
    youtubeIcon.addEventListener("click", (event) => {
        event.stopPropagation();
        window.open(data.youtube, "_blank");

    });
});


/* ============================================================
   SPOTIFY MINI-PLAYER BUBBLE
============================================================ */

function openSpotifyBubble(spotifyUrl) {
    const bubble = document.getElementById("playerBubble");
    const frame  = document.getElementById("spotifyFrame");

    if (!bubble || !frame || !spotifyUrl) return;

    // Bloquea sonidos hover
    hoverAudioBlocked = true;

    // Extraer ID del track para usar el reproductor embed
    const trackId = spotifyUrl.split("/track/")[1].split("?")[0];

    frame.src = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`;
    bubble.classList.remove("hidden");
}



/* ------------------------------------------------------------
   Cerrar burbuja Spotify
------------------------------------------------------------ */
const closeBubbleBtn = document.getElementById("closeBubble");

if (closeBubbleBtn) {
    closeBubbleBtn.addEventListener("click", () => {

        const bubble = document.getElementById("playerBubble");
        const frame  = document.getElementById("spotifyFrame");

        // Detener reproductor
        if (frame) frame.src = "";

        // Ocultar burbuja
        if (bubble) bubble.classList.add("hidden");

        // Permitir hover otra vez
        hoverAudioBlocked = false;
    });
}


/* ============================================================
   CAMBIO DE TEMA (ARMY MODE)
   *Nota: Idealmente este switch debería estar en theme.js,
   pero como ya existía aquí también, lo dejamos funcional.
============================================================ */

const toggleBtn = document.getElementById("themeToggle");

if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {

        document.body.classList.toggle("army-theme");

        toggleBtn.textContent = 
            document.body.classList.contains("army-theme")
                ? "Classic Mode 🌙"
                : "Army Mode 💜";
    });
}


// ===============================
// BOTÓN: Abrir EchoVerse
// ===============================
const echoBtn = document.getElementById("enterEchoVerse");

if (echoBtn) {
    echoBtn.addEventListener("click", () => {
        window.location.href = "echoverse/index.html";
    });
}



// ===============================
// BOTÓN: Activar Modo Misión
// ===============================
const missionBtn = document.getElementById("enterMissionMode");

if (missionBtn) {
    missionBtn.addEventListener("click", () => {
        window.location.href = "missions/index.html";
    });
}
