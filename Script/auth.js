/* ============================================================
   SISTEMA DE LOGIN — BTS ECHO
   Modal: abrir, cerrar, registrar, iniciar sesión
============================================================ */

const loginBtn   = document.getElementById("loginBtn");
const authModal  = document.getElementById("authModal");
const authClose  = document.getElementById("authClose");

const authLogin     = document.getElementById("authLogin");
const authRegister  = document.getElementById("authRegister");

const authName = document.getElementById("authName");
const authPass = document.getElementById("authPass");
const authMsg  = document.getElementById("authMessage");

const welcomeUser = document.getElementById("welcomeUser");

/* ============================
   ABRIR LOGIN
============================ */
if (loginBtn) {
    loginBtn.addEventListener("click", () => {
        authModal.classList.remove("hidden");
    });
}

/* ============================
   CERRAR LOGIN
============================ */
if (authClose) {
    authClose.addEventListener("click", () => {
        authModal.classList.add("hidden");
        authMsg.textContent = "";
    });
}

/* ============================
   REGISTRAR USUARIO
============================ */
if (authRegister) {
    authRegister.addEventListener("click", () => {
        const user = authName.value.trim();
        const pass = authPass.value.trim();

        if (!user || !pass) {
            authMsg.textContent = "Debes completar todos los campos.";
            return;
        }

        localStorage.setItem("btsUser", user);
        localStorage.setItem("btsPass", pass);

        authMsg.textContent = "Registro exitoso 💜";
    });
}

/* ============================
   INICIAR SESIÓN
============================ */
if (authLogin) {
    authLogin.addEventListener("click", () => {

        const user = authName.value.trim();
        const pass = authPass.value.trim();

        const savedUser = localStorage.getItem("btsUser");
        const savedPass = localStorage.getItem("btsPass");

        if (user === savedUser && pass === savedPass) {
            authMsg.textContent = "Bienvenido 💜";

            welcomeUser.textContent = `Bienvenido, ${user} 💜`;

            authModal.classList.add("hidden");
        } else {
            authMsg.textContent = "Usuario o contraseña incorrectos.";
        }
    });
}
