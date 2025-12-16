// Archivo: public/assets/js/auth.js — Propósito: UI + lógica de login/registro/logout/sesión y “forgot password” (SweetAlert) consumiendo /api/*.
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

// Signal to index.html inline fallbacks that the real auth logic is active.
window.__BtsEchoAuthWired = true;

// WHY: shared API helper reduces duplicated fetch/JSON parsing across files.
const api = window.BtsEchoApi;

function isFileProtocol() {
    return api?.isFileProtocol ? api.isFileProtocol() : (location.protocol === "file:");
}

async function requestJson(url, opts) {
    if (api?.requestJson) return api.requestJson(url, opts);

    const mergedHeaders = {
        ...(opts && opts.headers ? opts.headers : {}),
        Accept: "application/json",
    };

    const res = await fetch(url, {
        ...(opts || {}),
        credentials: "same-origin",
        cache: "no-store",
        headers: mergedHeaders,
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
}

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
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

function requireHttpForApi(message) {
    // WHY: multiple auth actions call /api/*; centralize file:// guard.
    if (api?.assertHttp) {
        api.assertHttp(message);
        return;
    }
    if (isFileProtocol()) {
        throw new Error(message || "Abre el sitio por http://localhost para usar /api/*");
    }
}

function fileProtocolMessageFor(endpoint) {
    return `Estás abriendo el proyecto como archivo (file://). Abre http://localhost:8000/ para que ${endpoint} funcione.`;
}

async function postJson(url, payload, fileProtocolErrorMessage) {
    // WHY: delegate to api.js for consistent headers + JSON parsing.
    requireHttpForApi(fileProtocolErrorMessage);
    if (api?.postJson) return api.postJson(url, payload);

    // Fallback: minimal behavior if api.js wasn't loaded.
    const res = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload || {})
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
}

function setHeaderLoggedOut() {
    // Asegura estado "logged out" limpio
    setText(welcomeUser, "");
    hide(welcomeUser);
    hide(welcomeBlock);
    hide(logoutBtn);
    show(loginBtn);
    updateLevelBar(null);
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
    if (isFileProtocol()) return null;
    try {
        const result = await requestJson("/api/progress.php");
        const data = result?.data;
        if (data?.success && data?.progress) return data.progress;
    } catch {
        // ignore
    }
    return null;
}

async function refreshHeaderUser() {
    if (isFileProtocol()) {
        setHeaderLoggedOut();
        return;
    }

    try {
        const result = await requestJson("/api/session.php");
        const data = result?.data;

        if (!data?.logged) {
            setHeaderLoggedOut();
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
        setHeaderLoggedOut();
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

// WHY: auth.js uses SweetAlert in a single place; centralize repeated theme options.
const SWAL_THEME = {
    background: "#0f0f1a",
    color: "#ffffff",
    confirmButtonColor: "#7c6cff",
    animation: false,
    heightAuto: false,
    width: 420,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Fallback: si por alguna razón el listener directo falla, capturamos el click en Login.
// Esto evita el caso "aprieto Login y no pasa nada".
document.addEventListener(
    "click",
    (e) => {
        const t = e && e.target;
        if (!t || t.id !== "loginBtn") return;
        try {
            show(authModal);
            setText(authMsg, "");
        } catch {
            // ignore
        }
    },
    true
);

/* ============================================================
   VERIFICAR SESIÓN AL CARGAR
============================================================ */
async function bootAuthHeader() {
    try {
        await refreshHeaderUser();
    } catch {
        // ignore
    }
}

// IMPORTANT: Do not rely only on DOMContentLoaded.
// Some browsers delay it if a deferred CDN script stalls.
bootAuthHeader();
window.addEventListener("pageshow", bootAuthHeader);
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") bootAuthHeader();
});

/* ============================================================
   ABRIR LOGIN
============================================================ */
if (loginBtn) {
    loginBtn.addEventListener("click", (e) => {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
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
    confirmRegister.addEventListener("click", async (e) => {
        if (e && typeof e.preventDefault === "function") e.preventDefault();

        setText(registerMsg, "Procesando...");

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
                fileProtocolMessageFor("/api/register.php")
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

// UX: permitir Enter para login/registro (sin form).
function wireEnterToClick(inputEl, buttonEl) {
    if (!inputEl || !buttonEl) return;
    inputEl.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        buttonEl.click();
    });
}

wireEnterToClick(authEmail, authLogin);
wireEnterToClick(authPass, authLogin);
wireEnterToClick(regName, confirmRegister);
wireEnterToClick(regEmail, confirmRegister);
wireEnterToClick(regPass, confirmRegister);

/* ============================================================
   INICIAR SESIÓN
============================================================ */
if (authLogin) {
    authLogin.addEventListener("click", async (e) => {
        if (e && typeof e.preventDefault === "function") e.preventDefault();

        setText(authMsg, "Procesando...");

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
                fileProtocolMessageFor("/api/login.php")
            );

            if (result.data?.success) {
                const token = result.data?.token ? String(result.data.token) : "";
                if (token) {
                    window.__BtsEchoAuthToken = token;
                    try { localStorage.setItem("btsecho_auth_token", token); } catch {}
                }

                // NOTE: We intentionally reload after login.
                // Some browsers may not attach a newly-set session cookie until after navigation.
                hide(authModal);
                setText(authMsg, "");
                location.reload();
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
    logoutBtn.addEventListener("click", async (e) => {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        try { localStorage.removeItem("btsecho_auth_token"); } catch {}
        try { delete window.__BtsEchoAuthToken; } catch {}
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

        // Si el CDN de SweetAlert2 está bloqueado o tarda, no rompemos el flujo.
        if (typeof window.Swal === "undefined") {
            const email = (prompt("Recuperar contraseña\n\nIngresa tu correo:") || "").trim();
            if (!email) return;
            if (!EMAIL_REGEX.test(email)) {
                alert("Ingresa un correo válido");
                return;
            }

            try {
                const result = await postJson(
                    "/api/forgot-password.php",
                    { email },
                    fileProtocolMessageFor("/api/forgot-password.php")
                );
                const data = result.data || { success: false, message: "Respuesta inválida del servidor" };
                alert(data.message);
            } catch {
                alert("No se pudo enviar el correo. Intenta más tarde.");
            }
            return;
        }

    const { value: email } = await Swal.fire({
    title: 'Recuperar contraseña 💜',
    text: 'Ingresa tu correo',
    input: 'text',
    inputPlaceholder: 'correo@ejemplo.com',

    showCancelButton: true,
    confirmButtonText: 'Enviar',
    cancelButtonText: 'Cancelar',

    autoFocus: false,
    ...SWAL_THEME,

    inputAttributes: {
        autocomplete: 'off',
        autocorrect: 'off',
        autocapitalize: 'off',
        spellcheck: 'false',
        name: 'no-autofill-email', // 👈 CLAVE
    },

    preConfirm: (value) => {
        if (!value) {
            Swal.showValidationMessage('Debes ingresar un correo');
            return false;
        }
        if (!EMAIL_REGEX.test(value)) {
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
                fileProtocolMessageFor("/api/forgot-password.php")
            );

            const data = result.data || { success: false, message: "Respuesta inválida del servidor" };

            Swal.fire({
                icon: data.success ? 'success' : 'error',
                title: data.success ? 'Correo enviado 💜' : 'Ups',
                text: data.message,
                confirmButtonText: 'Aceptar',
                ...SWAL_THEME,
            });

    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo enviar el correo. Intenta más tarde.',
                ...SWAL_THEME
      });
    }
  });
}

