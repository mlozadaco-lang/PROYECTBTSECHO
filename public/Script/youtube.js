/* ============================================================
   BTS Echo — Módulo YouTube Popup
   Abre una ventana pequeña centrada con YouTube y bloquea
   el audio hover mientras esté abierta.
   ============================================================ */

/**
 * Abre una ventana pequeña con YouTube para reproducir el video.
 * No se usa iframe para evitar el error 153 y restricciones de YouTube.
 */
function openYouTubeBubble(youtubeUrl) {

    if (!youtubeUrl) {
        console.error("URL de YouTube no encontrada");
        return;
    }

    // 🚫 Bloqueamos hover mientras YouTube está abierto
    if (typeof hoverAudioBlocked !== "undefined") {
        hoverAudioBlocked = true;
    }

    // Tamaño de la ventana
    const width = 600;
    const height = 400;

    // Posición centrada
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;

    // Abrir el popup
    const ytWin = window.open(
        youtubeUrl,
        "YouTubePlayer",
        `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=no`
    );

    // Si no se pudo abrir (bloqueo del navegador)
    if (!ytWin) {
        alert("Tu navegador bloqueó la ventana emergente. Actívala para reproducir en YouTube.");
        return;
    }

    // Detectar cierre automático para restaurar sonidos hover
    const checkWindow = setInterval(() => {
        if (ytWin.closed) {
            clearInterval(checkWindow);
            hoverAudioBlocked = false;  // ✔ Reactivar hover MP3
        }
    }, 300);
}
