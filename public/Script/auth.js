/* ============================================================
   SISTEMA DE LOGIN — BTS ECHO
   Login real con PHP + MySQL
============================================================ */

/* ===== ELEMENTOS HEADER ===== */
const loginBtn   = document.getElementById("loginBtn");
const logoutBtn  = document.getElementById("logoutBtn");
const welcomeUser = document.getElementById("welcomeUser");

/* ===== LOGIN MODAL ===== */
const authModal  = document.getElementById("authModal");
const authClose  = document.getElementById("authClose");

const authLogin     = document.getElementById("authLogin");
const authRegister  = document.getElementById("authRegister");

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
    try {
        const res = await fetch("/api/session.php");
        const data = await res.json();

        if (data.logged) {
            welcomeUser.textContent = `Bienvenido, ${data.user.name} 💜`;
            welcomeUser.classList.remove("hidden");

            logoutBtn.classList.remove("hidden");
            loginBtn.classList.add("hidden");
        }
    } catch {
        console.warn("No se pudo verificar la sesión");
    }
});

/* ============================================================
   ABRIR LOGIN
============================================================ */
if (loginBtn) {
    loginBtn.addEventListener("click", () => {
        authModal.classList.remove("hidden");
        authMsg.textContent = "";
    });
}

/* ============================================================
   CERRAR LOGIN
============================================================ */
if (authClose) {
    authClose.addEventListener("click", () => {
        authModal.classList.add("hidden");
        authMsg.textContent = "";
    });
}

/* ============================================================
   ABRIR REGISTRO DESDE LOGIN
============================================================ */
if (openRegister) {
    openRegister.addEventListener("click", (e) => {
        e.preventDefault();
        authModal.classList.add("hidden");
        registerModal.classList.remove("hidden");
        registerMsg.textContent = "";
    });
}

/* ============================================================
   CERRAR REGISTRO
============================================================ */
if (closeRegister) {
    closeRegister.addEventListener("click", () => {
        registerModal.classList.add("hidden");
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
            registerMsg.textContent = "Completa todos los campos.";
            return;
        }

        try {
            const res = await fetch("/api/register.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password: pass })
            });

            const data = await res.json();
            registerMsg.textContent = data.message;

            if (data.success) {
                setTimeout(() => {
                    registerModal.classList.add("hidden");
                    authModal.classList.remove("hidden");
                }, 1200);
            }

        } catch {
            registerMsg.textContent = "Error al registrar.";
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
            authMsg.textContent = "Debes ingresar correo y contraseña.";
            return;
        }

        try {
            const res = await fetch("/api/login.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password: pass })
            });

            const data = await res.json();

            if (data.success) {
                welcomeUser.textContent = `Bienvenido, ${data.name} 💜`;
                welcomeUser.classList.remove("hidden");

                authModal.classList.add("hidden");
                authMsg.textContent = "";

                logoutBtn.classList.remove("hidden");
                loginBtn.classList.add("hidden");
            } else {
                authMsg.textContent = data.message;
            }

        } catch {
            authMsg.textContent = "No se pudo conectar con el servidor.";
        }
    });
}

/* ============================================================
   CERRAR SESIÓN
============================================================ */
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await fetch("/api/logout.php");
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
      const res = await fetch("/api/forgot-password.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const text = await res.text();
      const data = JSON.parse(text);

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

