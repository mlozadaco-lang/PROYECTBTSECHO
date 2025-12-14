/* ============================================================
   BTS Echo — MÓDULO DE CHAT
   Maneja la apertura y cierre del panel de chat en la esquina.
============================================================ */

/* ------------------------------------------------------------
   Selección de elementos
------------------------------------------------------------ */
const chatToggleBtn = document.getElementById("chatToggle");
const communityChat = document.getElementById("communityChat");


/* ============================================================
   EVENTO: Abrir / cerrar chat al hacer click
============================================================ */

if (chatToggleBtn && communityChat) {

    chatToggleBtn.addEventListener("click", () => {
        
        // Alternamos la visibilidad usando la clase correcta
        communityChat.classList.toggle("active");

        // Cambiar visual del botón si quieres animaciones futuras
        chatToggleBtn.classList.toggle("active");
    });
}

/* ==========================================================
   SIMULACIÓN DE CHAT
========================================================== */

const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");

// Enviar mensaje propio
function sendMyMessage() {
    const text = chatInput.value.trim();
    if (text === "") return;

    const div = document.createElement("div");
    div.classList.add("msg", "me");
    div.innerHTML = `<p>${text}</p>`;

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    chatInput.value = "";
}

// Botón enviar
chatSend.addEventListener("click", sendMyMessage);

// Enter para enviar
chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMyMessage();
});
/* ============================================================
   BOTÓN PARA CERRAR EL CHAT
============================================================ */

const closeChatBtn = document.getElementById("closeChat");

if (closeChatBtn && communityChat) {
    closeChatBtn.addEventListener("click", () => {
        communityChat.classList.remove("active");
        chatToggleBtn.classList.remove("active"); 
    });
}


