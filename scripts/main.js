import { setupThemeToggle } from "./features/theme-toggle.js";
import { setupFooterOptions } from "./features/footer-options.js";
import { setupLanguageToggle } from "./features/i18n.js";
import {
  setupAutoHideNavigation,
  setupMobileNavigation,
} from "./features/navigation.js";
import {
  setupLanguageCarousel,
  setupToolsCarousel,
} from "./features/skills-carousel.js";
import { setupScrollBackButton } from "./features/scrollback.js";
import { setupConsoleWindow } from "./features/console-window.js";
import { setupTechFinder } from "./features/tech-finder.js";

async function setupCoreFeatures() {
  setupTechFinder();
  setupConsoleWindow();

  try {
    await setupLanguageToggle();
  } catch (error) {
    console.error("setupLanguageToggle failed", error);
  }
}

function setupUiFeatures() {
  const setupFunctions = [
    setupThemeToggle,
    setupFooterOptions,
    setupMobileNavigation,
    setupAutoHideNavigation,
    setupLanguageCarousel,
    setupToolsCarousel,
    setupScrollBackButton,
  ];

  for (const setupFunction of setupFunctions) {
    setupFunction();
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  await setupCoreFeatures();
  setupUiFeatures();
});
