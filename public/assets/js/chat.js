const chatToggleBtn = document.getElementById("chatToggle");
const communityChat = document.getElementById("communityChat");
const closeChatBtn = document.getElementById("closeChat");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");

if (chatToggleBtn && communityChat) {
    chatToggleBtn.addEventListener("click", () => {
        communityChat.classList.toggle("active");
        chatToggleBtn.classList.toggle("active");
    });
}

function sendMyMessage() {
    if (!chatInput || !chatMessages) return;
    const text = chatInput.value.trim();
    if (!text) return;

    const div = document.createElement("div");
    div.className = "msg me";
    div.innerHTML = `<p>${text}</p>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    chatInput.value = "";
}

if (chatSend) chatSend.addEventListener("click", sendMyMessage);
if (chatInput) {
    chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMyMessage();
    });
}

if (closeChatBtn && communityChat && chatToggleBtn) {
    closeChatBtn.addEventListener("click", () => {
        communityChat.classList.remove("active");
        chatToggleBtn.classList.remove("active");
    });
}


