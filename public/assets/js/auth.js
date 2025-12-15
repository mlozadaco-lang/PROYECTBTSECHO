/* ============================================================
   SISTEMA DE LOGIN — BTS ECHO
   Login real con PHP + MySQL
============================================================ */

/* ===== ELEMENTOS HEADER ===== */
const loginBtn   = document.getElementById("loginBtn");
const logoutBtn  = document.getElementById("logoutBtn");
const welcomeUser = document.getElementById("welcomeUser");
const welcomeBlock = document.getElementById("welcomeBlock");
const levelBar = document.getElementById("levelBar");
const levelBarFill = document.getElementById("levelBarFill");

// WHY: shared API helper reduces duplicated fetch/JSON parsing across files.
const api = window.BtsEchoApi;

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function isFileProtocol() {
    // WHY: keep a single definition of file:// detection (api.js) when available.
    return api?.isFileProtocol ? api.isFileProtocol() : (location.protocol === "file:");
}

function hide(el) {
    if (el) el.classList.add("hidden");
}

function show(el) {
    if (el) el.classList.remove("hidden");
}

function setText(el, value) {
    if (el) el.textContent = value == null ? "" : String(value);
}

async function readJsonResponse(res) {
    const raw = await res.text();
    try {
        return raw ? JSON.parse(raw) : null;
    } catch {
        throw new Error("Respuesta no-JSON del servidor: " + String(raw || "").slice(0, 200));
    }
}

async function postJson(url, payload, fileProtocolErrorMessage) {
    // WHY: delegate to api.js for consistent Accept/Content-Type and safe JSON parsing.
    if (isFileProtocol()) throw new Error(fileProtocolErrorMessage);
    if (api?.postJson) return api.postJson(url, payload);

    // Fallback: preserve previous behavior if api.js was not loaded.
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {})
    });
    const data = await readJsonResponse(res);
    return { ok: res.ok, data };
}

function updateLevelBar(progress) {
    if (!levelBar || !levelBarFill) return;

    if (!progress || typeof progress.xp_per_level !== "number") {
        levelBar.classList.add("hidden");
        levelBarFill.style.width = "0%";
        return;
    }

    const xpPerLevel = progress.xp_per_level || 0;
    const xpIntoLevel = typeof progress.xp_into_level === "number" ? progress.xp_into_level : 0;

    if (xpPerLevel <= 0) {
        levelBar.classList.add("hidden");
        levelBarFill.style.width = "0%";
        return;
    }

    const pct = clamp((xpIntoLevel / xpPerLevel) * 100, 0, 100);
    levelBarFill.style.width = pct.toFixed(2) + "%";
    levelBar.classList.remove("hidden");
}

async function getProgress() {
    try {
        const result = api?.requestJson
            ? await api.requestJson("/api/progress.php")
            : await fetch("/api/progress.php", { headers: { "Accept": "application/json" } }).then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => null) }));

        const data = result?.data;
        if (data?.success && data?.progress) return data.progress;
        return null;
    } catch {
        return null;
    }
}

async function refreshHeaderUser() {
    try {
        const result = api?.requestJson
            ? await api.requestJson("/api/session.php")
            : await fetch("/api/session.php", { headers: { "Accept": "application/json" } }).then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => null) }));

        const data = result?.data;

        if (!data.logged) {
            // Asegura estado "logged out" limpio
            setText(welcomeUser, "");
            hide(welcomeUser);
            hide(welcomeBlock);
            hide(logoutBtn);
            show(loginBtn);
            updateLevelBar(null);
            return;
        }

        const progress = await getProgress();
        const suffix = progress ? ` (Nivel ${progress.level} • XP ${progress.experience})` : "";

        setText(welcomeUser, `Bienvenido, ${data.user.name} 💜${suffix}`);
        show(welcomeUser);
        show(welcomeBlock);
        updateLevelBar(progress);

        show(logoutBtn);
        hide(loginBtn);
    } catch {
        console.warn("No se pudo verificar la sesión");
    }
}

/* ===== LOGIN MODAL ===== */
const authModal  = document.getElementById("authModal");
const authClose  = document.getElementById("authClose");

const authLogin     = document.getElementById("authLogin");

const authEmail = document.getElementById("authEmail");
const authPass  = document.getElementById("authPass");
const authMsg   = document.getElementById("authMessage");

/* ===== REGISTER MODAL ===== */
const registerModal = document.getElementById("registerModal");
const closeRegister = document.getElementById("closeRegister");
const openRegister  = document.getElementById("openRegister");

const regName  = document.getElementById("regName");
const regEmail = document.getElementById("regEmail");
const regPass  = document.getElementById("regPass");
const registerMsg = document.getElementById("registerMessage");
const confirmRegister = document.getElementById("confirmRegister");

/* ============================================================
   VERIFICAR SESIÓN AL CARGAR
============================================================ */
window.addEventListener("DOMContentLoaded", async () => {
    await refreshHeaderUser();
});

/* ============================================================
   ABRIR LOGIN
============================================================ */
if (loginBtn) {
    loginBtn.addEventListener("click", () => {
        show(authModal);
        setText(authMsg, "");
    });
}

/* ============================================================
   CERRAR LOGIN
============================================================ */
if (authClose) {
    authClose.addEventListener("click", () => {
        hide(authModal);
        setText(authMsg, "");
    });
}

/* ============================================================
   ABRIR REGISTRO DESDE LOGIN
============================================================ */
if (openRegister) {
    openRegister.addEventListener("click", (e) => {
        e.preventDefault();
        hide(authModal);
        show(registerModal);
        setText(registerMsg, "");
    });
}

/* ============================================================
   CERRAR REGISTRO
============================================================ */
if (closeRegister) {
    closeRegister.addEventListener("click", () => {
        hide(registerModal);
    });
}

/* ============================================================
   REGISTRAR USUARIO (MODAL REGISTRO)
============================================================ */
if (confirmRegister) {
    confirmRegister.addEventListener("click", async () => {

        const name  = regName.value.trim();
        const email = regEmail.value.trim();
        const pass  = regPass.value.trim();

        if (!name || !email || !pass) {
            setText(registerMsg, "Completa todos los campos.");
            return;
        }

        try {
            const result = await postJson(
                "/api/register.php",
                { name, email, password: pass },
                "Estás abriendo el proyecto como archivo (file://). Abre http://localhost:8000/ para que /api/register.php funcione."
            );

            setText(registerMsg, result.data?.message);

            if (result.data?.success) {
                setTimeout(() => {
                    hide(registerModal);
                    show(authModal);
                }, 1200);
            }

        } catch (err) {
            setText(registerMsg, err?.message || "Error al registrar.");
        }
    });
}

/* ============================================================
   INICIAR SESIÓN
============================================================ */
if (authLogin) {
    authLogin.addEventListener("click", async () => {

        const email = authEmail.value.trim();
        const pass  = authPass.value.trim();

        if (!email || !pass) {
            setText(authMsg, "Debes ingresar correo y contraseña.");
            return;
        }

        try {
            const result = await postJson(
                "/api/login.php",
                { email, password: pass },
                "Estás abriendo el proyecto como archivo (file://). Abre http://localhost:8000/ para que /api/login.php funcione."
            );

            if (result.data?.success) {
                hide(authModal);
                setText(authMsg, "");

                // Actualiza header con nivel/XP
                await refreshHeaderUser();
            } else {
                setText(authMsg, result.data?.message);
            }

        } catch (err) {
            setText(authMsg, err?.message || "No se pudo conectar con el servidor.");
        }
    });
}

/* ============================================================
   CERRAR SESIÓN
============================================================ */
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        // WHY: keep logout robust if server returns non-JSON (we don't need response content).
        try {
            if (api?.requestJson) await api.requestJson("/api/logout.php", { method: "POST" });
            else await fetch("/api/logout.php");
        } catch {
            // ignore
        }
        location.reload();
    });
}

/* ============================================================
   RECUPERAR CONTRASEÑA (SIN ALERT, PRO)
============================================================ */
const openForgot = document.getElementById("openForgot");

if (openForgot) {
  openForgot.addEventListener("click", async (e) => {
    e.preventDefault();

    const { value: email } = await Swal.fire({
    title: 'Recuperar contraseña 💜',
    text: 'Ingresa tu correo',
    input: 'text',
    inputPlaceholder: 'correo@ejemplo.com',

    showCancelButton: true,
    confirmButtonText: 'Enviar',
    cancelButtonText: 'Cancelar',

    autoFocus: false,
    animation: false,
    heightAuto: false,
    width: 420,

    inputAttributes: {
        autocomplete: 'off',
        autocorrect: 'off',
        autocapitalize: 'off',
        spellcheck: 'false',
        name: 'no-autofill-email', // 👈 CLAVE
    },

    background: '#0f0f1a',
    color: '#ffffff',
    confirmButtonColor: '#7c6cff',

    preConfirm: (value) => {
        if (!value) {
        Swal.showValidationMessage('Debes ingresar un correo');
        return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
        Swal.showValidationMessage('Ingresa un correo válido');
        return false;
        }
        return value;
    }
    });

    if (!email) return;


    try {
            // WHY: use shared helper to reduce boilerplate (headers + JSON parsing).
            const result = await postJson(
                "/api/forgot-password.php",
                { email },
                "Estás abriendo el proyecto como archivo (file://). Abre http://localhost:8000/ para que /api/forgot-password.php funcione."
            );

            const data = result.data || { success: false, message: "Respuesta inválida del servidor" };

      Swal.fire({
        icon: data.success ? 'success' : 'error',
        title: data.success ? 'Correo enviado 💜' : 'Ups',
        text: data.message,
        confirmButtonText: 'Aceptar',
        background: '#0f0f1a',
        color: '#ffffff',
        confirmButtonColor: '#7c6cff'
      });

    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo enviar el correo. Intenta más tarde.',
        confirmButtonColor: '#7c6cff',
        background: '#0f0f1a',
        color: '#ffffff'
      });
    }
  });
}

