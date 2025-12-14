// Evento ejemplo cuando se entra a cada era
document.querySelectorAll(".btn-era").forEach(btn => {
    btn.addEventListener("click", () => {
        const era = btn.dataset.era;

        alert("Pronto disponible: " + era.toUpperCase());
    });
});
