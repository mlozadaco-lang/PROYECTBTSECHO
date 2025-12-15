document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("resetForm");
    const messageDiv = document.getElementById("resetMessage");

    if (!form || !messageDiv) return;

    if (location.protocol === "file:") {
        messageDiv.textContent = "Abre esta página desde http://localhost:8000/ para poder llamar a /api/reset-password.php";
        messageDiv.style.color = "red";
        return;
    }

    const resetToken = new URLSearchParams(window.location.search).get("token");
    if (!resetToken) {
        messageDiv.textContent = "Token inválido.";
        messageDiv.style.color = "red";
        return;
    }

    form.addEventListener("submit", async function(e) {
        e.preventDefault();

        const password = document.getElementById("newPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (password.length < 8) {
            messageDiv.textContent = "La contraseña debe tener mínimo 8 caracteres.";
            messageDiv.style.color = "red";
            return;
        }

        if (password !== confirmPassword) {
            messageDiv.textContent = "Las contraseñas no coinciden.";
            messageDiv.style.color = "red";
            return;
        }

        try {
            const response = await fetch("/api/reset-password.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: resetToken, password })
            });

            const data = await response.json();

            if (data.success) {
                messageDiv.textContent = "Contraseña restablecida correctamente.";
                messageDiv.style.color = "green";
                setTimeout(() => {
                    window.location.href = "/index.html";
                }, 1500);
            } else {
                messageDiv.textContent = data.message || "No se pudo restablecer la contraseña.";
                messageDiv.style.color = "red";
            }
        } catch (error) {
            messageDiv.textContent = "Error al intentar restablecer la contraseña. Intenta más tarde.";
            messageDiv.style.color = "red";
        }
    });
});
