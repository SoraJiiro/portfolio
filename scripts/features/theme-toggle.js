import { translate } from "./i18n.js";

const THEME_STORAGE_KEY = "portfolio-theme";
const LIGHT_THEME = "light";
const DARK_THEME = "dark";

export function setupThemeToggle() {
  const themeToggleButtons = Array.from(
    document.querySelectorAll("[data-theme-toggle]"),
  );

  if (themeToggleButtons.length === 0) {
    return;
  }

  const isLightThemeEnabled = () =>
    document.body.classList.contains("theme-light");
  const getCurrentTheme = () =>
    isLightThemeEnabled() ? LIGHT_THEME : DARK_THEME;

  const getNextActionLabel = (theme) => {
    return theme === LIGHT_THEME
      ? translate("theme.activateDark")
      : translate("theme.activateLight");
  };

  const syncButtonState = (button, theme) => {
    const nextActionLabel = getNextActionLabel(theme);

    button.setAttribute("aria-pressed", String(theme === LIGHT_THEME));
    button.setAttribute("aria-label", nextActionLabel);
    button.setAttribute("title", nextActionLabel);

    if (button.classList.contains("footer-theme-toggle")) {
      button.textContent = nextActionLabel;
    }
  };

  const applyTheme = (theme) => {
    document.body.classList.toggle("theme-light", theme === LIGHT_THEME);

    for (const button of themeToggleButtons) {
      syncButtonState(button, theme);
    }

    window.dispatchEvent(new Event("portfolio-theme-change"));
  };

  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const initialTheme = savedTheme === LIGHT_THEME ? LIGHT_THEME : DARK_THEME;
  applyTheme(initialTheme);

  for (const button of themeToggleButtons) {
    button.addEventListener("click", () => {
      const nextTheme = isLightThemeEnabled() ? DARK_THEME : LIGHT_THEME;

      applyTheme(nextTheme);
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    });
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== THEME_STORAGE_KEY) {
      return;
    }

    const syncedTheme =
      event.newValue === LIGHT_THEME ? LIGHT_THEME : DARK_THEME;
    applyTheme(syncedTheme);
  });

  window.addEventListener("portfolio-language-change", () => {
    applyTheme(getCurrentTheme());
  });
}
