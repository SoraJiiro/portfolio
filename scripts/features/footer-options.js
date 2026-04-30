import { translate } from "./i18n.js";

const socialsConfigUrl = new URL("../../assets/socials.json", import.meta.url);
const TERMINAL_SKIP_STORAGE_KEY = "terminalSkip";

function getLocalizedSocialValue(value, fallback = "") {
  const pageLanguage = document.documentElement.lang === "en" ? "en" : "fr";

  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    return value[pageLanguage] ?? value.fr ?? value.en ?? fallback;
  }

  return fallback;
}

function getSocialLabel(social) {
  return getLocalizedSocialValue(social.label, social.id);
}

function getSocialDisplay(social) {
  return getLocalizedSocialValue(social.display, "");
}

function setAnchorDisplayText(anchor, text) {
  if (!text) {
    return;
  }

  const explicitTarget = anchor.querySelector("[data-social-display]");
  if (explicitTarget) {
    explicitTarget.textContent = text;
    return;
  }

  const firstSpan = anchor.querySelector("span");
  if (firstSpan) {
    firstSpan.textContent = text;
    return;
  }

  const textNodes = Array.from(anchor.childNodes).filter(
    (node) => node.nodeType === Node.TEXT_NODE,
  );

  if (textNodes.length > 0) {
    textNodes[textNodes.length - 1].textContent = text;
    return;
  }

  anchor.append(document.createTextNode(text));
}

function isExternalSocialLink(href) {
  return /^https?:\/\//i.test(href);
}

function applySocialUrlsToAnchors(socials) {
  const socialById = new Map(
    socials
      .filter((social) => social && social.id)
      .map((social) => [social.id, social]),
  );

  const anchors = document.querySelectorAll("a[data-social-id]");
  for (const anchor of anchors) {
    const socialId = anchor.getAttribute("data-social-id");
    if (!socialId) {
      continue;
    }

    const social = socialById.get(socialId);
    if (!social || !social.href) {
      continue;
    }

    anchor.setAttribute("href", social.href);
    setAnchorDisplayText(anchor, getSocialDisplay(social));

    if (isExternalSocialLink(social.href)) {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
    } else {
      anchor.removeAttribute("target");
      if (anchor.getAttribute("rel") === "noopener noreferrer") {
        anchor.removeAttribute("rel");
      }
    }
  }
}

function renderFooterSocials(socials) {
  const socialsList = document.querySelector("[data-socials-list]");
  if (!socialsList) {
    return;
  }

  socialsList.innerHTML = "";

  for (const social of socials) {
    if (!social || !social.id || !social.href) {
      continue;
    }

    const listItem = document.createElement("li");
    const socialLink = document.createElement("a");
    const icon = document.createElement("i");

    const socialLabel = getSocialLabel(social);

    socialLink.className = "footer-social-link";
    socialLink.setAttribute("href", social.href);
    socialLink.setAttribute("aria-label", socialLabel);
    socialLink.setAttribute("title", socialLabel);

    if (isExternalSocialLink(social.href)) {
      socialLink.setAttribute("target", "_blank");
      socialLink.setAttribute("rel", "noopener noreferrer");
    }

    icon.className = social.icon || "fa-solid fa-link";
    icon.setAttribute("aria-hidden", "true");

    socialLink.append(icon);
    listItem.append(socialLink);
    socialsList.append(listItem);
  }
}

async function setupDynamicSocials() {
  try {
    const response = await fetch(socialsConfigUrl);

    if (!response.ok) {
      throw new Error(`Unable to load socials config: ${response.status}`);
    }

    const data = await response.json();
    const socials = Array.isArray(data.socials) ? data.socials : [];

    const refreshSocialsContent = () => {
      applySocialUrlsToAnchors(socials);
      renderFooterSocials(socials);
    };

    refreshSocialsContent();

    window.addEventListener("portfolio-language-change", () => {
      refreshSocialsContent();
    });
  } catch (error) {
    console.error("Failed to load socials config", error);
  }
}

export function setupFooterOptions() {
  setupDynamicSocials();

  const terminalToggleBtn = document.getElementById("terminal-reset-btn");

  if (!terminalToggleBtn) {
    return;
  }

  const setButtonLabel = (label) => {
    terminalToggleBtn.textContent = label;
    terminalToggleBtn.setAttribute("aria-label", label);
    terminalToggleBtn.setAttribute("title", label);
  };

  const isIntroDisabled = () => {
    return localStorage.getItem(TERMINAL_SKIP_STORAGE_KEY) === "true";
  };

  const syncTerminalToggleState = () => {
    const label = isIntroDisabled()
      ? translate("terminal.enableIntro")
      : translate("terminal.disableIntro");

    setButtonLabel(label);
  };

  syncTerminalToggleState();

  terminalToggleBtn.addEventListener("click", () => {
    if (isIntroDisabled()) {
      localStorage.removeItem(TERMINAL_SKIP_STORAGE_KEY);
    } else {
      localStorage.setItem(TERMINAL_SKIP_STORAGE_KEY, "true");
    }

    syncTerminalToggleState();
  });

  window.addEventListener("portfolio-language-change", () => {
    syncTerminalToggleState();
  });
}
