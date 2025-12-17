// Archivo: public/assets/js/theme.js — Propósito: toggle “Army Mode” (tema) y autocompletar misión asociada si el usuario está logueado.
/* ============================================================
   BTS Echo — MODE SWITCH (ARMY MODE)
   Controla el cambio de tema visual entre el modo clásico
   y el modo ARMY púrpura.
   ============================================================ */

/* ------------------------------------------------------------
   Selección del botón de cambio de tema (único listener)
------------------------------------------------------------ */
const themeToggleBtn = document.getElementById("themeToggle");

// WHY: these helpers exist in public/assets/js/api.js to keep code DRY across pages.
const api = window.BtsEchoApi;

function findArmyModeMission(missions) {
    if (!Array.isArray(missions)) return null;
    return missions.find(m => String((m && m.title) ? m.title : "").toLowerCase().includes("army mode")) || null;
}

async function autoCompleteArmyModeMissionIfPossible(isArmyEnabled) {
    // Solo completamos cuando el usuario activa Army Mode.
    if (!isArmyEnabled) return;

    // Si estás en file://, no hay API.
    if (api && api.isFileProtocol && api.isFileProtocol()) return;

    try {
        const sessionResp = (api && api.requestJson) ? await api.requestJson("/api/session.php") : null;
        const session = (sessionResp && sessionResp.data) ? sessionResp.data : null;
        if (!session || !session.logged) return;

        const missionsResp = (api && api.requestJson) ? await api.requestJson("/api/missions.php") : null;
        const missionsData = (missionsResp && missionsResp.data) ? missionsResp.data : null;
        const missions = (missionsData && Array.isArray(missionsData.missions)) ? missionsData.missions : [];

        const armyMission = findArmyModeMission(missions);
        if (!armyMission || !armyMission.id) return;

        // Si ya estaba completada, no hacemos nada.
        if (String(armyMission.status || "").toLowerCase() === "completed") return;

        // WHY: shared postJson keeps headers/body consistent across the app.
        if (!api || !api.postJson) return;
        await api.postJson("/api/complete-mission.php", {
            mission_id: Number(armyMission.id),
            proof: "Army Mode activado en el portal",
        });
    } catch {
        // Silencioso: el toggle no debe fallar por la misión.
    }
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", async () => {
        document.body.classList.toggle("army-theme");

        const isArmy = document.body.classList.contains("army-theme");
        themeToggleBtn.textContent = isArmy ? "Classic Mode 🌙" : "Army Mode 💜";

        // Misión automática: se completa al activar Army Mode.
        autoCompleteArmyModeMissionIfPossible(isArmy);
    });
}
