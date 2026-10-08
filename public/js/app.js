// Navigation entre les trois sections + démarrage des modules.
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => {
      const on = t === tab;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on);
    });
    document.querySelectorAll(".panel").forEach(p => {
      const on = p.id === tab.dataset.tab;
      p.classList.toggle("is-active", on);
      p.hidden = !on;
    });
  });
});

Writing.init();
Pronunciation.init();
Flashcards.init();
