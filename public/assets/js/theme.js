/* ============================================================
   BTS Echo — MODE SWITCH (ARMY MODE)
   Controla el cambio de tema visual entre el modo clásico
   y el modo ARMY púrpura.
   ============================================================ */

/* ------------------------------------------------------------
   Selección del botón de cambio de tema (único listener)
------------------------------------------------------------ */
const themeToggleBtn = document.getElementById("themeToggle");

function isFileProtocol() {
    return location.protocol === "file:";
}

async function fetchJson(url, opts) {
    const res = await fetch(url, {
        headers: { "Accept": "application/json", ...(opts?.headers || {}) },
        ...opts,
    });
    return res.json();
}

async function postJson(url, payload) {
    return fetchJson(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
    });
}

function findArmyModeMission(missions) {
    if (!Array.isArray(missions)) return null;
    return missions.find(m => String(m?.title || "").toLowerCase().includes("army mode")) || null;
}

async function autoCompleteArmyModeMissionIfPossible(isArmyEnabled) {
    // Solo completamos cuando el usuario activa Army Mode.
    if (!isArmyEnabled) return;

    // Si estás en file://, no hay API.
    if (isFileProtocol()) return;

    try {
        const session = await fetchJson("/api/session.php");
        if (!session?.logged) return;

        const missionsData = await fetchJson("/api/missions.php");
        const missions = Array.isArray(missionsData?.missions) ? missionsData.missions : [];

        const armyMission = findArmyModeMission(missions);
        if (!armyMission?.id) return;

        // Si ya estaba completada, no hacemos nada.
        if (String(armyMission.status || "").toLowerCase() === "completed") return;

        await postJson("/api/complete-mission.php", {
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
