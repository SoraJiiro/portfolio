import i18next from "https://cdn.jsdelivr.net/npm/i18next@23.16.5/+esm";
import LanguageDetector from "https://cdn.jsdelivr.net/npm/i18next-browser-languagedetector@8.0.0/+esm";

const LANGUAGE_STORAGE_KEY = "portfolio-language";
const ATTRIBUTE_MAPPINGS = [
  { dataKey: "data-i18n-aria-label", attribute: "aria-label" },
  { dataKey: "data-i18n-title", attribute: "title" },
  { dataKey: "data-i18n-alt", attribute: "alt" },
  { dataKey: "data-i18n-content", attribute: "content" },
];

const TRANSLATION_FILE_URLS = {
  fr: new URL("../../assets/i18n/fr.json", import.meta.url),
  en: new URL("../../assets/i18n/en.json", import.meta.url),
};

let loadedResources = null;
let resourcesLoadPromise = null;
let initializationPromise = null;
let activeLanguage = "fr";
let isInitialized = false;
let isStorageSyncBound = false;

function syncActiveLanguage() {
  const detectedLanguage = i18next.resolvedLanguage || i18next.language || "fr";
  activeLanguage = detectedLanguage.startsWith("en") ? "en" : "fr";
}

function normalizeLanguage(language) {
  return language === "en" ? "en" : "fr";
}

async function loadLanguageTranslations(language) {
  const fileUrl = TRANSLATION_FILE_URLS[language];
  if (!fileUrl) {
    return {};
  }

  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(
        `Unable to load ${language} translations: ${response.status}`,
      );
    }

    const data = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return {};
    }

    return data;
  } catch (error) {
    console.error(`Failed to load ${language} translations`, error);
    return {};
  }
}

async function loadResources() {
  if (loadedResources) {
    return loadedResources;
  }

  if (!resourcesLoadPromise) {
    resourcesLoadPromise = Promise.all(
      Object.keys(TRANSLATION_FILE_URLS).map(async (language) => {
        const translation = await loadLanguageTranslations(language);
        return [language, { translation }];
      }),
    ).then((entries) => {
      loadedResources = Object.fromEntries(entries);
      return loadedResources;
    });
  }

  return resourcesLoadPromise;
}

async function ensureI18nInitialized() {
  if (isInitialized) {
    return;
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      const resources = await loadResources();

      await i18next.use(LanguageDetector).init({
        resources,
        fallbackLng: "fr",
        supportedLngs: ["fr", "en"],
        nonExplicitSupportedLngs: true,
        detection: {
          order: ["localStorage", "navigator"],
          lookupLocalStorage: LANGUAGE_STORAGE_KEY,
          caches: [],
        },
        interpolation: {
          escapeValue: false,
        },
        returnEmptyString: false,
      });

      syncActiveLanguage();
      isInitialized = true;
    })();
  }

  await initializationPromise;
}

export function translate(key, options = {}) {
  return i18next.t(key, options);
}

export function getActiveLanguage() {
  return activeLanguage;
}

function applyNodeTranslations(selector, attribute, setter) {
  const nodes = document.querySelectorAll(selector);

  for (const node of nodes) {
    const key = node.getAttribute(attribute);
    if (!key) {
      continue;
    }

    setter(node, i18next.t(key));
  }
}

function applyTextTranslations() {
  applyNodeTranslations("[data-i18n]", "data-i18n", (node, value) => {
    node.textContent = value;
  });

  applyNodeTranslations("[data-i18n-html]", "data-i18n-html", (node, value) => {
    node.innerHTML = value;
  });
}

function applyAttributeTranslations() {
  for (const mapping of ATTRIBUTE_MAPPINGS) {
    const nodes = document.querySelectorAll(`[${mapping.dataKey}]`);
    for (const node of nodes) {
      const key = node.getAttribute(mapping.dataKey);
      if (!key) {
        continue;
      }

      node.setAttribute(mapping.attribute, i18next.t(key));
    }
  }
}

function applyMetaTranslations() {
  document.title = i18next.t("meta.title");

  const descriptionMeta = document.querySelector('meta[name="description"]');
  if (descriptionMeta) {
    descriptionMeta.setAttribute("content", i18next.t("meta.description"));
  }
}

function updateLanguageToggleButtons() {
  const languageToggleButtons = document.querySelectorAll(
    "[data-language-toggle]",
  );
  const switchLabel =
    activeLanguage === "fr"
      ? i18next.t("language.switchToEnglish")
      : i18next.t("language.switchToFrench");

  for (const button of languageToggleButtons) {
    button.textContent = i18next.t("language.toggleText");
    button.setAttribute("aria-label", switchLabel);
    button.setAttribute("title", switchLabel);
  }
}

export async function applyLanguage(language, options = {}) {
  await ensureI18nInitialized();

  const shouldPersist = options.persist !== false;
  const shouldEmit = options.emit !== false;

  const normalizedLanguage = normalizeLanguage(language);
  await i18next.changeLanguage(normalizedLanguage);
  syncActiveLanguage();
  document.documentElement.lang = activeLanguage;

  applyMetaTranslations();
  applyTextTranslations();
  applyAttributeTranslations();
  updateLanguageToggleButtons();

  if (shouldPersist) {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, activeLanguage);
  }

  if (shouldEmit) {
    window.dispatchEvent(
      new CustomEvent("portfolio-language-change", {
        detail: { language: activeLanguage },
      }),
    );
  }
}

export async function setupLanguageToggle() {
  await ensureI18nInitialized();

  const languageToggleButtons = document.querySelectorAll(
    "[data-language-toggle]",
  );

  await applyLanguage(activeLanguage, { persist: false, emit: false });

  if (!isStorageSyncBound) {
    window.addEventListener("storage", (event) => {
      if (event.key !== LANGUAGE_STORAGE_KEY) {
        return;
      }

      const syncedLanguage = normalizeLanguage(event.newValue);
      if (syncedLanguage === activeLanguage) {
        return;
      }

      applyLanguage(syncedLanguage, { persist: false, emit: true });
    });

    isStorageSyncBound = true;
  }

  for (const button of languageToggleButtons) {
    button.addEventListener("click", async () => {
      const nextLanguage = activeLanguage === "fr" ? "en" : "fr";
      await applyLanguage(nextLanguage, { persist: true, emit: true });
    });
  }
}
