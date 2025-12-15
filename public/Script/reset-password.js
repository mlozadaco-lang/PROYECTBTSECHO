document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("resetForm");
    const messageDiv = document.getElementById("resetMessage");
    const resetToken = new URLSearchParams(window.location.search).get('token');
    document.getElementById("resetToken").value = resetToken;

    form.addEventListener("submit", async function(e) {
        e.preventDefault();

        const password = document.getElementById("newPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            messageDiv.textContent = "Las contraseñas no coinciden.";
            messageDiv.style.color = "red";
            return;
        }

        // Realizamos el envío al backend
        try {
            const response = await fetch('/api/reset-password.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: resetToken,
                    password: password
                })
            });

            const data = await response.json();

            if (data.success) {
                messageDiv.textContent = "Contraseña restablecida correctamente.";
                messageDiv.style.color = "green";
                setTimeout(() => {
                    window.location.href = "/index.html"; // Redirigir a la página de inicio
                }, 3000);
            } else {
                messageDiv.textContent = data.message;
                messageDiv.style.color = "red";
            }
        } catch (error) {
            messageDiv.textContent = "Error al intentar restablecer la contraseña. Intenta más tarde.";
            messageDiv.style.color = "red";
        }
    });
});
