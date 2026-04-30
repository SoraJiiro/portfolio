const SCROLLBACK_THRESHOLD = 420;

export function setupScrollBackButton() {
  const scrollbackButton = document.getElementById("scrollback-btn");

  if (!scrollbackButton) {
    return;
  }

  const setVisible = (isVisible) => {
    scrollbackButton.classList.toggle("is-visible", isVisible);
  };

  const updateVisibility = () => {
    setVisible(window.scrollY > SCROLLBACK_THRESHOLD);
  };

  window.addEventListener("scroll", updateVisibility, { passive: true });

  scrollbackButton.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  updateVisibility();
}
