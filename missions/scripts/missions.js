document.querySelectorAll(".mission-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const id = btn.dataset.id;

        switch (id) {
            case "stream":
                alert("Pronto podrás ver tu progreso de streaming 💜");
                break;
            case "message":
                alert("Pronto podrás enviar un mensaje ARMY 💜");
                break;
            case "memory":
                alert("Pronto podrás subir tus recuerdos 💜");
                break;
        }
    });
});
