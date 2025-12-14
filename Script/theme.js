/* ============================================================
   BTS Echo — MODE SWITCH (ARMY MODE)
   Controla el cambio de tema visual entre el modo clásico
   y el modo ARMY púrpura.
   ============================================================ */

/* ------------------------------------------------------------
   Selección del botón de cambio de tema
------------------------------------------------------------ */
const themeToggleBtn = document.getElementById("themeToggle");


/* ============================================================
   EVENTO: Cambiar Tema al hacer click
============================================================ */

if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
        
        // Activar / Desactivar clase visual
        document.body.classList.toggle("army-theme");

        // Ajustar texto dinámico del botón
        const isArmy = document.body.classList.contains("army-theme");
        themeToggleBtn.textContent = isArmy ? "Classic Mode 🌙" : "Army Mode 💜";
    });
}

// Theme Switch: ARMY MODE 💜
const themeBtn = document.querySelector(".theme-switch");

themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("army-theme");

    if (document.body.classList.contains("army-theme")) {
        themeBtn.textContent = "Standard Mode ✨";
    } else {
        themeBtn.textContent = "Army Mode 💜";
    }
});
