// WHY: use shared helper (api.js) to avoid duplicating fetch helpers across files.
const IS_FILE = window.BtsEchoApi?.isFileProtocol ? window.BtsEchoApi.isFileProtocol() : (location.protocol === "file:");

function wireStaticButtons() {
    const actions = {
        stream: () => alert("Pronto podrás ver tu progreso de streaming 💜"),
        army: () => { window.location.href = "../index.html"; },
        message: () => alert("Pronto podrás enviar un mensaje ARMY 💜"),
        memory: () => alert("Pronto podrás subir tus recuerdos 💜")
    };

    document.querySelectorAll(".mission-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const id = btn.dataset.id;
            (actions[id] || (() => alert("Misión seleccionada 💜")))();
        });
    });
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function fetchJson(url, options) {
    // WHY: keep local wrapper name so the rest of the file stays readable,
    // but delegate implementation to the shared helper.
    if (window.BtsEchoApi?.requestJson) return window.BtsEchoApi.requestJson(url, options);
    // Fallback (should be rare): minimal behavior if api.js wasn't loaded.
    try {
        const res = await fetch(url, options);
        const data = await res.json().catch(() => null);
        return { ok: res.ok, data };
    } catch {
        return { ok: false, status: 0, data: null };
    }
}

async function getSession() {
    const r = await fetchJson("/api/session.php", { headers: { "Accept": "application/json" } });
    return r.data || { logged: false };
}

async function getProgress() {
    const r = await fetchJson("/api/progress.php", { headers: { "Accept": "application/json" } });
    return (r.data && r.data.success && r.data.progress) ? r.data.progress : null;
}

async function renderMissionHeaderProgress() {
    const el = document.getElementById("missionProgress");
    const bar = document.getElementById("missionLevelBar");
    const fill = document.getElementById("missionLevelBarFill");
    if (!el) return;

    if (IS_FILE) {
        el.textContent = "";
        if (bar) bar.style.display = "none";
        return;
    }

    const session = await getSession();
    if (!session?.logged) {
        el.textContent = "";
        if (bar) bar.style.display = "none";
        return;
    }

    const progress = await getProgress();
    if (!progress) {
        el.textContent = "";
        if (bar) bar.style.display = "none";
        return;
    }

    el.textContent = `Nivel ${progress.level} • XP ${progress.experience}`;

    if (bar && fill && typeof progress.xp_per_level === "number" && progress.xp_per_level > 0) {
        const xpIntoLevel = typeof progress.xp_into_level === "number" ? progress.xp_into_level : 0;
        const pct = Math.max(0, Math.min(100, (xpIntoLevel / progress.xp_per_level) * 100));
        fill.style.width = pct.toFixed(2) + "%";
        bar.style.display = "block";
    } else if (bar) {
        bar.style.display = "none";
    }
}

async function completeMission(missionId, proof) {
    const r = await fetchJson("/api/complete-mission.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mission_id: missionId, proof })
    });
    return { ok: r.ok, data: r.data };
}

function isArmyModeMission(titleLower) {
    return titleLower.includes("army mode") || titleLower.includes("modo army");
}

function proofPlaceholderFor(titleLower) {
    if (titleLower.includes("mensaje")) return "Escribe tu mensaje ARMY aquí...";
    if (titleLower.includes("recuerdo") || titleLower.includes("entrega")) {
        return "Pega un link (Drive/Imgur/red social) o describe tu recuerdo...";
    }
    if (titleLower.includes("stream") || titleLower.includes("streaming") || titleLower.includes("desaf")) {
        return "Pega un link (YouTube/Spotify) o escribe qué canción escuchaste...";
    }
    return "Escribe una prueba (texto o link)...";
}

function actionLabelFor(titleLower) {
    if (titleLower.includes("mensaje")) return "Enviar mensaje";
    if (titleLower.includes("recuerdo") || titleLower.includes("entrega")) return "Guardar recuerdo";
    if (isArmyModeMission(titleLower)) return "Ir al portal";
    return "Marcar como completada";
}

async function loadMissionsFromApi() {
    const grid = document.querySelector(".mission-grid");
    if (!grid) return;

    if (IS_FILE) {
        // En file:// no se puede llamar a /api/*; mantenemos el contenido estático
        return;
    }

    try {
        const session = await getSession();
        const isLogged = !!session?.logged;

        const r = await fetchJson("/api/missions.php", { headers: { "Accept": "application/json" } });
        const data = r.data;

        if (!data.success || !Array.isArray(data.missions) || data.missions.length === 0) {
            return;
        }

        grid.innerHTML = "";
        data.missions.forEach((m) => {
            const card = document.createElement("article");
            card.className = "mission-card";

            const status = (m.status || "pending").toLowerCase();
            const isCompleted = status === "completed";

            const title = String(m.title || "");
            const titleLower = title.toLowerCase();
            const proofPlaceholder = proofPlaceholderFor(titleLower);

            const proofText = (m.proof == null) ? "" : String(m.proof);

            // Botón: que sea “la acción real” dentro del sitio.
            // - streaming: sigue siendo manual (no podemos validar Spotify/YouTube real sin APIs).
            // - mensaje/recuerdo: al enviar/guardar, se completa automáticamente porque esa es la acción.
            const actionLabel = actionLabelFor(titleLower);
            const isArmy = isArmyModeMission(titleLower);

            card.innerHTML = `
                <h2>${escapeHtml(m.title || "Misión")}</h2>
                <p>${escapeHtml(m.description || "")}</p>
                <p class="mission-status" style="margin: 8px 0; opacity: 0.85;">Estado: <strong class="mission-status-value">${isCompleted ? "Completada" : "Pendiente"}</strong></p>
                ${isCompleted
                    ? (proofText ? `<p class="mission-proof-display"><strong>Prueba:</strong> ${escapeHtml(proofText)}</p>` : "")
                    : (isArmy ? "" : `
                        <textarea class="mission-proof" rows="3" placeholder="${escapeHtml(proofPlaceholder)}"></textarea>
                    `)
                }
                <button class="mission-btn" data-id="${m.id}">${isCompleted ? "Completada" : escapeHtml(actionLabel)}</button>
            `;

            const btn = card.querySelector(".mission-btn");
            if (isCompleted) {
                btn.disabled = true;
            } else {
                btn.addEventListener("click", async () => {
                    if (!isLogged) {
                        alert("Debes iniciar sesión para completar misiones.");
                        return;
                    }

                    // Misión automática (dentro del sitio): se completa al activar Army Mode en el portal.
                    if (isArmy) {
                        window.location.href = "../index.html";
                        return;
                    }

                    // Anti-trampa (MVP): prueba obligatoria, pero simple (textarea)
                    const proofInput = card.querySelector(".mission-proof");
                    const proof = (proofInput?.value || "").trim();
                    if (proof.length < 5) {
                        alert("Necesitas escribir una prueba (mínimo 5 caracteres).");
                        return;
                    }

                    const result = await completeMission(Number(m.id), proof);
                    if (result.ok && result.data?.success) {
                        btn.disabled = true;
                        btn.textContent = "Completada";

                        const statusLine = card.querySelector(".mission-status-value");
                        if (statusLine) statusLine.textContent = "Completada";

                        // Mostramos la prueba que se guardó
                        if (proofInput) {
                            const proofDisplay = document.createElement("p");
                            proofDisplay.className = "mission-proof-display";
                            const strong = document.createElement("strong");
                            strong.textContent = "Prueba:";
                            proofDisplay.appendChild(strong);
                            proofDisplay.appendChild(document.createTextNode(" "));
                            proofDisplay.appendChild(document.createTextNode(proof));
                            proofInput.replaceWith(proofDisplay);
                        }
                    } else {
                        alert(result.data?.message || "No se pudo completar la misión.");
                    }
                });
            }

            grid.appendChild(card);
        });
    } catch {
        // Si falla el backend, dejamos el contenido estático
    }
}

document.addEventListener("DOMContentLoaded", () => {
    wireStaticButtons();
    renderMissionHeaderProgress();
    loadMissionsFromApi();
});
