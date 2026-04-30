import { applyLanguage, translate } from "./i18n.js";
import {
  getFlappyExperienceCopy,
  getMatrixExperienceCopy,
  launchFlappyExperience,
  launchMatrixExperience,
} from "./console-experiences.js";

const commandInput = document.querySelector(".cmd-input");
const historyContainer = document.querySelector(".history");
const commandRow = document.querySelector(".cmd-row");
const commandPrompt = document.querySelector(".cmd-prompt");
const commandTyped = document.querySelector(".cmd-typed");
const consoleRoot = document.querySelector(".console");
const consoleHeader = document.querySelector(".c-header");
const headerActionButtons = Array.from(
  document.querySelectorAll(".c-header-action[data-header-action]"),
);
const HISTORY_STORAGE_KEY = "portfolio_console_cmd_history";
const COMMAND_PROMPT_TEXT = "GUEST@KA:~$";
const CONSOLE_WINDOW_MESSAGE_TYPE = "portfolio-console-window";
const REBOOT_RESTORED_EVENT = "portfolio-reboot-restored";
const isEmbeddedConsole = window.self !== window.top;
const LANGUAGE_STORAGE_KEY = "portfolio-language";
const THEME_STORAGE_KEY = "portfolio-theme";
const SYSTEM_WIPE_ARGS = new Set([
  "-fr /",
  "-rf /",
  "-fr / --no-preserve-root",
  "-rf / --no-preserve-root",
  "-fr /*",
  "-rf /*",
  "-fr /* --no-preserve-root",
  "-rf /* --no-preserve-root",
  "-fr *",
  "-rf *",
]);

const projectsCatalog = [
  {
    id: 1,
    titleKey: "project.portfolio.title",
    descKey: "project.portfolio.desc",
    url: "https://github.com/SoraJiiro/PorteFolio",
  },
  {
    id: 2,
    titleKey: "project.wiki.title",
    descKey: "project.wiki.desc",
    url: "https://github.com/SoraJiiro/Rainbow6Wiki",
  },
  {
    id: 3,
    titleKey: "project.mp3.title",
    descKey: "project.mp3.desc",
    url: "https://github.com/SoraJiiro/STLMP3D",
  },
  {
    id: 4,
    titleKey: "project.svt.title",
    descKey: "project.svt.desc",
    url: "https://github.com/SoraJiiro/SVT",
  },
];

const i18next = {
  t: translate,
  changeLanguage(language) {
    return applyLanguage(language, { persist: true, emit: true });
  },
  on(eventName, callback) {
    if (eventName === "languageChanged") {
      window.addEventListener("portfolio-language-change", callback);
    }
  },
};

if (
  !commandInput ||
  !historyContainer ||
  !commandRow ||
  !commandPrompt ||
  !commandTyped ||
  !consoleRoot ||
  !consoleHeader
) {
  throw new Error(
    "Console introuvable: elements .cmd-input, .history ou .cmd-row manquants.",
  );
}

function postConsoleWindowMessage(eventName, payload = {}) {
  if (!isEmbeddedConsole) {
    return;
  }

  window.parent.postMessage(
    {
      type: CONSOLE_WINDOW_MESSAGE_TYPE,
      eventName,
      ...payload,
    },
    "*",
  );
}

function handleHeaderAction(action) {
  if (isEmbeddedConsole) {
    postConsoleWindowMessage("action", { action });
    return;
  }

  if (action === "tab") {
    document.body.classList.toggle("console-tabbed");
    return;
  }

  if (action === "resize") {
    document.body.classList.toggle("console-maximized");
    return;
  }

  if (action === "quit") {
    window.location.href = "../index.html";
  }
}

function setupHeaderActions() {
  for (const button of headerActionButtons) {
    button.addEventListener("click", () => {
      const action = button.getAttribute("data-header-action");
      if (!action) {
        return;
      }

      handleHeaderAction(action);
    });
  }
}

function setupHeaderDragMessaging() {
  if (!isEmbeddedConsole || !consoleHeader) {
    return;
  }

  let dragPointerId = null;

  consoleHeader.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }

    if (
      event.target instanceof Element &&
      event.target.closest(".c-header-action")
    ) {
      return;
    }

    dragPointerId = event.pointerId;
    consoleHeader.classList.add("is-dragging");
    consoleHeader.setPointerCapture(event.pointerId);
    postConsoleWindowMessage("drag-start", {
      screenX: event.screenX,
      screenY: event.screenY,
    });
  });

  consoleHeader.addEventListener("pointermove", (event) => {
    if (dragPointerId !== event.pointerId) {
      return;
    }

    postConsoleWindowMessage("drag-move", {
      screenX: event.screenX,
      screenY: event.screenY,
    });
  });

  const stopDrag = (event) => {
    if (dragPointerId !== event.pointerId) {
      return;
    }

    dragPointerId = null;
    consoleHeader.classList.remove("is-dragging");
    postConsoleWindowMessage("drag-end");

    if (consoleHeader.hasPointerCapture(event.pointerId)) {
      consoleHeader.releasePointerCapture(event.pointerId);
    }
  };

  consoleHeader.addEventListener("pointerup", stopDrag);
  consoleHeader.addEventListener("pointercancel", stopDrag);
  consoleHeader.addEventListener("lostpointercapture", stopDrag);
}

function getStoredLanguage() {
  const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return storedLanguage === "en" ? "en" : "fr";
}

async function syncLanguageFromStorage() {
  await applyLanguage(getStoredLanguage(), { persist: false, emit: true });
}

function loadCmdHistory() {
  const rawHistory = localStorage.getItem(HISTORY_STORAGE_KEY);

  if (!rawHistory) {
    return [];
  }

  try {
    const parsedHistory = JSON.parse(rawHistory);
    if (Array.isArray(parsedHistory)) {
      return parsedHistory;
    }
  } catch (error) {
    return [];
  }

  return [];
}

function saveCmdHistory(history) {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
}

let cmdHistory = loadCmdHistory();
let historyCursor = cmdHistory.length;
let historyDraft = "";
let isRebootSimulationRunning = false;

function escapeHtml(text) {
  return String(text).replace(/[&<>'"]/g, (char) => {
    if (char === "&") {
      return "&amp;";
    }

    if (char === "<") {
      return "&lt;";
    }

    if (char === ">") {
      return "&gt;";
    }

    if (char === "'") {
      return "&#39;";
    }

    return "&quot;";
  });
}

function linkifyText(text) {
  const escapedText = escapeHtml(text);
  return escapedText.replace(/(https?:\/\/[^\s<]+)/g, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
}

function scrollConsoleToBottom() {
  historyContainer.scrollTop = historyContainer.scrollHeight;
  commandRow.scrollIntoView({ block: "end", inline: "nearest" });

  window.requestAnimationFrame(() => {
    historyContainer.scrollTop = historyContainer.scrollHeight;
    commandRow.scrollIntoView({ block: "end", inline: "nearest" });
  });
}

function appendOutputLine(text, variant = "output", options = {}) {
  const { renderLinks = false } = options;
  const line = document.createElement("div");
  line.className = `entry entry-${variant}`;
  if (renderLinks) {
    line.innerHTML = linkifyText(text);
  } else {
    line.textContent = text;
  }
  historyContainer.insertBefore(line, commandRow);
  scrollConsoleToBottom();
}

function syncTypedPreview() {
  commandTyped.textContent = commandInput.value;
}

function getCommandTimestamp() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function clearConsoleOutput() {
  historyContainer.querySelectorAll(".entry").forEach((entry) => {
    entry.remove();
  });
  scrollConsoleToBottom();
}

function getStoredTheme() {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === "light" ? "light" : "dark";
}

function applyConsoleTheme(theme, options = { persist: true, emit: true }) {
  const normalizedTheme = theme === "light" ? "light" : "dark";
  const isLight = normalizedTheme === "light";

  document.body.classList.toggle("theme-light", isLight);
  document.documentElement.classList.toggle("theme-light", isLight);

  if (isEmbeddedConsole) {
    try {
      const parentWindow = window.parent;
      if (parentWindow && parentWindow !== window) {
        parentWindow.document?.body.classList.toggle("theme-light", isLight);
        parentWindow.document?.documentElement.classList.toggle(
          "theme-light",
          isLight,
        );
        parentWindow.dispatchEvent(new Event("portfolio-theme-change"));
      }
    } catch {
      // Ignore cross-context access issues.
    }
  }

  if (options.persist) {
    localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
  }

  if (options.emit) {
    window.dispatchEvent(new Event("portfolio-theme-change"));
  }

  return normalizedTheme;
}

function syncThemeFromStorage() {
  applyConsoleTheme(getStoredTheme(), { persist: false, emit: true });
}

function findProjectSelection(args) {
  if (!Array.isArray(args) || args.length === 0) {
    return null;
  }

  if (args.length !== 1) {
    return NaN;
  }

  const token = args[0];
  if (/^-\d+$/.test(token)) {
    return Number(token.slice(1));
  }

  return NaN;
}

function getRmTargetDocument() {
  if (!isEmbeddedConsole) {
    return document;
  }

  try {
    const parentDocument = window.parent?.document;
    if (parentDocument && parentDocument !== document && parentDocument.body) {
      return parentDocument;
    }
  } catch (error) {
    return document;
  }

  return document;
}

function getRemovableCandidates(targetDocument) {
  const blockedSelectors = ["html", "head", "body", "script", "style", "link"];

  if (targetDocument === document) {
    blockedSelectors.push(
      ".cmd-row",
      ".cmd-row *",
      ".cmd-input",
      ".cmd-prompt",
      ".cmd-typed",
      ".cmd-caret",
      ".reboot-overlay",
      ".reboot-overlay *",
    );
  } else {
    blockedSelectors.push("#console-window-layer", "#console-window-layer *");
  }

  const blockedSet = new Set();
  for (const selector of blockedSelectors) {
    for (const node of targetDocument.querySelectorAll(selector)) {
      blockedSet.add(node);
    }
  }

  return Array.from(targetDocument.body.querySelectorAll("*"))
    .filter((element) => !blockedSet.has(element))
    .filter((element) => {
      if (targetDocument !== document) {
        return true;
      }

      return element !== commandRow && !element.contains(commandRow);
    });
}

function getRandomRemovableElement(targetDocument = getRmTargetDocument()) {
  const candidates = getRemovableCandidates(targetDocument);

  if (candidates.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex];
}

function getWipeSequence(targetDocument) {
  const candidates = getRemovableCandidates(targetDocument);

  const shuffledCandidates = [...candidates];

  for (let index = shuffledCandidates.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledCandidates[index], shuffledCandidates[swapIndex]] = [
      shuffledCandidates[swapIndex],
      shuffledCandidates[index],
    ];
  }

  return shuffledCandidates;
}

function dispatchRebootRestoredEvent(targetDocument) {
  const targetWindow = targetDocument?.defaultView || window;

  targetWindow.dispatchEvent(
    new CustomEvent(REBOOT_RESTORED_EVENT, {
      detail: { source: "console-rm-reboot" },
    }),
  );
}

function sleep(delay) {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

function describeElement(element) {
  const idPart = element.id ? `#${element.id}` : "";
  const classPart =
    typeof element.className === "string" && element.className.trim()
      ? `.${element.className.trim().split(/\s+/).join(".")}`
      : "";
  return `<${element.tagName.toLowerCase()}${idPart}${classPart}>`;
}

function createRebootOverlay() {
  const overlay = document.createElement("div");
  overlay.className = "reboot-overlay";

  const title = document.createElement("div");
  title.className = "reboot-title";
  title.textContent = i18next.t("console.rm.reboot.overlayTitle");

  const progress = document.createElement("div");
  progress.className = "reboot-progress";

  const progressBar = document.createElement("div");
  progressBar.className = "reboot-progress-bar";
  progress.appendChild(progressBar);

  const lines = document.createElement("div");
  lines.className = "reboot-lines";

  overlay.append(title, progress, lines);

  return { overlay, lines };
}

function appendRebootLine(linesRoot, key) {
  appendRebootText(linesRoot, i18next.t(key));
}

function appendRebootText(linesRoot, text) {
  const line = document.createElement("p");
  line.textContent = text;
  linesRoot.appendChild(line);
  linesRoot.scrollTop = linesRoot.scrollHeight;
}

async function runRmFrRebootSimulation() {
  if (isRebootSimulationRunning) {
    return;
  }

  isRebootSimulationRunning = true;
  commandInput.disabled = true;
  commandRow.classList.remove("is-focused");

  const targetDocument = getRmTargetDocument();
  const removedNodes = [];
  let overlay = null;

  try {
    const wipeTargets = getWipeSequence(targetDocument);
    let removedCount = 0;
    let restoredCount = 0;

    for (const targetElement of wipeTargets) {
      if (!targetElement.isConnected || !targetElement.parentNode) {
        continue;
      }

      const removedElement = describeElement(targetElement);
      const placeholder = targetDocument.createComment(
        "rm-fr-restore-placeholder",
      );
      targetElement.parentNode.insertBefore(placeholder, targetElement);

      removedNodes.push({
        element: targetElement,
        placeholder,
      });

      removedCount += 1;

      targetElement.remove();

      const deletedLine = i18next.t("console.rm.reboot.deleted", {
        element: removedElement,
        index: removedCount,
      });

      appendOutputLine(deletedLine, "system");

      await sleep(95);
    }

    const rebootOverlay = createRebootOverlay();
    overlay = rebootOverlay.overlay;
    const lines = rebootOverlay.lines;

    document.body.appendChild(overlay);
    document.body.classList.add("is-rebooting");

    const phases = [
      { delay: 220, key: "console.rm.reboot.phase1" },
      { delay: 520, key: "console.rm.reboot.phase2" },
      { delay: 820, key: "console.rm.reboot.phase3" },
      { delay: 1120, key: "console.rm.reboot.phase4" },
    ];

    phases.forEach((phase) => {
      setTimeout(() => {
        appendRebootLine(lines, phase.key);
      }, phase.delay);
    });

    await sleep(3400);

    clearConsoleOutput();

    for (let index = removedNodes.length - 1; index >= 0; index -= 1) {
      const removedNode = removedNodes[index];

      if (removedNode.placeholder && removedNode.placeholder.parentNode) {
        removedNode.placeholder.parentNode.replaceChild(
          removedNode.element,
          removedNode.placeholder,
        );
        restoredCount += 1;
      } else if (!removedNode.element.isConnected) {
        targetDocument.body.appendChild(removedNode.element);
        restoredCount += 1;
      }
    }

    if (restoredCount < removedCount) {
      for (const removedNode of removedNodes) {
        if (removedNode.element.isConnected) {
          continue;
        }

        targetDocument.body.appendChild(removedNode.element);
        restoredCount += 1;
      }
    }

    dispatchRebootRestoredEvent(targetDocument);

    appendOutputLine(
      i18next.t("console.rm.reboot.restored", {
        removed: removedCount,
        restored: restoredCount,
      }),
      "system",
    );
    appendOutputLine(i18next.t("console.rm.reboot.done"), "system");
  } finally {
    document.body.classList.remove("is-rebooting");

    if (overlay) {
      overlay.remove();
    }

    commandInput.disabled = false;
    commandInput.value = "";
    syncTypedPreview();
    commandInput.focus();
    commandRow.classList.add("is-focused");
    isRebootSimulationRunning = false;
  }
}

function isSystemWipeCommand(args) {
  if (!Array.isArray(args) || args.length === 0) {
    return false;
  }

  const compactArgs = args.join(" ").replace(/\s+/g, " ").trim();
  return SYSTEM_WIPE_ARGS.has(compactArgs);
}

const commandDocs = {
  help: "console.help.desc",
  info: "console.info.desc",
  clear: "console.clear.desc",
  history: "console.history.desc",
  echo: "console.echo.desc",
  repo: "console.repo.desc",
  projects: "console.projects.desc",
  contact: "console.contact.desc",
  lang: "console.lang.desc",
  mode: "console.mode.desc",
  rm: "console.rm.desc",
  exit: "console.exit.desc",
  matrix: "console.matrix.desc",
  flappy: "console.flappy.desc",
  // ai: "console.ai.desc"
};

const commandHandlers = {
  help(args) {
    if (args.length > 0) {
      return i18next.t("console.generic.noArgsUsage", { command: "help" });
    }

    const availableCommands = Object.keys(commandDocs)
      .map((cmd) => `'${cmd}'`)
      .join(", ");
    return `${i18next.t("console.help.desc")} ${availableCommands}`;
  },

  info(args) {
    if (args.length !== 1) {
      return i18next.t("console.info.usage");
    }

    const targetCommand = args[0];

    if (!commandDocs[targetCommand]) {
      return i18next.t("console.info.unknown", { command: targetCommand });
    }

    return `${targetCommand}: ${i18next.t(commandDocs[targetCommand])}`;
  },

  clear(args) {
    if (args.length === 1 && args[0] === "-h") {
      cmdHistory = [];
      saveCmdHistory(cmdHistory);
      historyCursor = 0;
      historyDraft = "";
      return i18next.t("console.clear.feedbackHistory");
    }

    if (args.length === 0) {
      clearConsoleOutput();
      return i18next.t("console.clear.feedback");
    }

    return i18next.t("console.clear.usage");
  },

  history(args) {
    if (args.length > 0) {
      return i18next.t("console.generic.noArgsUsage", { command: "history" });
    }

    if (cmdHistory.length === 0) {
      return i18next.t("console.history.empty");
    }

    const historyList = cmdHistory
      .map((cmd, index) => `${index + 1}. ${cmd}`)
      .join("\n");
    return `${i18next.t("console.history.list")}\n${historyList}`;
  },

  echo(args) {
    if (args.length === 0) {
      return i18next.t("console.echo.usage");
    }

    return args.join(" ");
  },

  repo(args) {
    if (args.length > 0) {
      return i18next.t("console.generic.noArgsUsage", { command: "repo" });
    }

    window.open("https://github.com/SoraJiiro/PorteFolio", "_blank");
    return i18next.t("console.repo.opening");
  },

  projects(args) {
    const selectedProjectId = findProjectSelection(args);

    if (selectedProjectId === null) {
      const projectList = projectsCatalog
        .map(
          (project) =>
            `${project.id}. ${i18next.t(project.titleKey)} - ${project.url}`,
        )
        .join("\n");

      return `${i18next.t("console.projects.listTitle")}\n${i18next.t("console.projects.usage")}\n${projectList}`;
    }

    if (Number.isNaN(selectedProjectId)) {
      return i18next.t("console.projects.usage");
    }

    const selectedProject = projectsCatalog.find(
      (project) => project.id === selectedProjectId,
    );

    if (!selectedProject) {
      return i18next.t("console.projects.unknown", { id: selectedProjectId });
    }

    window.open(selectedProject.url, "_blank", "noopener,noreferrer");

    return i18next.t("console.projects.selected", {
      id: selectedProject.id,
      title: i18next.t(selectedProject.titleKey),
      url: selectedProject.url,
    });
  },

  contact(args) {
    if (args.length > 0) {
      return i18next.t("console.contact.usage");
    }

    const contactList = [
      `- ${i18next.t("contact.email.title")}: ${i18next.t("contact.email.desc")}`,
      `- ${i18next.t("contact.github.title")}: ${i18next.t("contact.github.desc")}`,
    ].join("\n");
    return `${i18next.t("console.contact.listTitle")}\n${contactList}`;
  },

  async lang(args) {
    if (args.length !== 1 || !["fr", "en"].includes(args[0])) {
      return i18next.t("console.lang.usage");
    }

    const targetLang = args[0];

    await i18next.changeLanguage(targetLang);
    return i18next.t("console.lang.success", { lang: targetLang });
  },

  mode(args) {
    if (args.length > 0) {
      return i18next.t("console.generic.noArgsUsage", { command: "mode" });
    }

    const nextTheme = document.body.classList.contains("theme-light")
      ? "dark"
      : "light";

    applyConsoleTheme(nextTheme, { persist: true, emit: true });

    return i18next.t("console.mode.success", { mode: nextTheme });
  },

  rm(args) {
    if (args.length > 0 && !isSystemWipeCommand(args)) {
      return i18next.t("console.rm.usage");
    }

    if (isSystemWipeCommand(args)) {
      if (isRebootSimulationRunning) {
        return i18next.t("console.rm.reboot.alreadyRunning");
      }

      void runRmFrRebootSimulation();
      return i18next.t("console.rm.reboot.triggered");
    }

    const targetElement = getRandomRemovableElement(getRmTargetDocument());

    if (!targetElement) {
      return i18next.t("console.rm.noCandidate");
    }

    const removedElement = describeElement(targetElement);
    targetElement.remove();
    return i18next.t("console.rm.removed", { element: removedElement });
  },

  exit(args) {
    if (args.length > 0) {
      return i18next.t("console.generic.noArgsUsage", { command: "exit" });
    }

    setTimeout(() => {
      if (isEmbeddedConsole) {
        postConsoleWindowMessage("action", { action: "quit" });
        return;
      }

      window.location.href = "../index.html";
    }, 120);
    return i18next.t("console.exit.redirecting");
  },

  matrix(args) {
    if (args.length > 0) {
      return i18next.t("console.generic.noArgsUsage", { command: "matrix" });
    }

    const status = launchMatrixExperience(getMatrixExperienceCopy(i18next.t));

    if (status === "already-running") {
      return i18next.t("console.matrix.alreadyRunning");
    }

    return i18next.t("console.matrix.starting");
  },

  flappy(args) {
    if (args.length > 0) {
      return i18next.t("console.generic.noArgsUsage", { command: "flappy" });
    }

    const status = launchFlappyExperience(getFlappyExperienceCopy(i18next.t));

    if (status === "already-running") {
      return i18next.t("console.flappy.alreadyRunning");
    }

    return i18next.t("console.flappy.starting");
  },
};

async function executeCommand(rawCommandLine) {
  const [commandName, ...args] = rawCommandLine.trim().split(/\s+/);
  const handler = commandHandlers[commandName];

  if (!handler) {
    return i18next.t("console.unknownCommand", { command: commandName });
  }

  return handler(args);
}

function updateUIText() {
  document.querySelector(".c-header h1").textContent =
    i18next.t("console.title");
  const tabIcon = document.querySelector('[data-header-action="tab"]');
  const resizeIcon = document.querySelector('[data-header-action="resize"]');
  const quitIcon = document.querySelector('[data-header-action="quit"]');

  if (tabIcon) {
    const label = i18next.t("console.tab.tab");
    tabIcon.setAttribute("title", label);
    tabIcon.setAttribute("aria-label", label);
  }

  if (resizeIcon) {
    const label = i18next.t("console.tab.resize");
    resizeIcon.setAttribute("title", label);
    resizeIcon.setAttribute("aria-label", label);
  }

  if (quitIcon) {
    const label = i18next.t("console.tab.quit");
    quitIcon.setAttribute("title", label);
    quitIcon.setAttribute("aria-label", label);
  }

  document.querySelector(".c-content pre").textContent =
    i18next.t("console.credits");
  commandPrompt.textContent = COMMAND_PROMPT_TEXT;
}

i18next.on("languageChanged", () => {
  updateUIText();
});

syncLanguageFromStorage().catch(() => {
  updateUIText();
});

syncThemeFromStorage();

window.addEventListener("storage", (event) => {
  if (event.key === LANGUAGE_STORAGE_KEY) {
    syncLanguageFromStorage();
    return;
  }

  if (event.key === THEME_STORAGE_KEY) {
    syncThemeFromStorage();
  }
});

setupHeaderActions();
setupHeaderDragMessaging();

function hasActiveTextSelection() {
  const selection = window.getSelection();
  return Boolean(selection && !selection.isCollapsed && selection.toString());
}

consoleRoot.addEventListener("click", (event) => {
  if (hasActiveTextSelection()) {
    return;
  }

  if (
    event.target instanceof Element &&
    event.target.closest(".c-header-action, .entry a")
  ) {
    return;
  }

  commandInput.focus();
});

commandRow.addEventListener("click", () => {
  if (hasActiveTextSelection()) {
    return;
  }

  commandInput.focus();
});

commandInput.addEventListener("focus", () => {
  commandRow.classList.add("is-focused");
});

commandInput.addEventListener("blur", () => {
  commandRow.classList.remove("is-focused");
});

commandInput.addEventListener("input", () => {
  if (historyCursor === cmdHistory.length) {
    historyDraft = commandInput.value;
  }
  syncTypedPreview();
});

commandInput.addEventListener("keydown", async (event) => {
  if (event.key === "ArrowUp") {
    if (cmdHistory.length === 0) {
      return;
    }

    event.preventDefault();
    if (historyCursor === cmdHistory.length) {
      historyDraft = commandInput.value;
    }

    historyCursor = Math.max(0, historyCursor - 1);
    commandInput.value = cmdHistory[historyCursor] || "";
    syncTypedPreview();
    return;
  }

  if (event.key === "ArrowDown") {
    if (cmdHistory.length === 0) {
      return;
    }

    event.preventDefault();
    historyCursor = Math.min(cmdHistory.length, historyCursor + 1);
    if (historyCursor === cmdHistory.length) {
      commandInput.value = historyDraft;
    } else {
      commandInput.value = cmdHistory[historyCursor] || "";
    }

    syncTypedPreview();
    return;
  }

  if (event.key !== "Enter") {
    return;
  }

  const commandLine = commandInput.value.trim();

  if (!commandLine) {
    return;
  }

  cmdHistory.push(commandLine);
  saveCmdHistory(cmdHistory);
  historyCursor = cmdHistory.length;
  historyDraft = "";

  const timestamp = getCommandTimestamp();
  appendOutputLine(
    `[${timestamp}] ${COMMAND_PROMPT_TEXT} ${commandLine}`,
    "command",
  );

  const result = await executeCommand(commandLine);
  if (result) {
    appendOutputLine(result, "output", { renderLinks: true });
  }

  commandInput.value = "";
  syncTypedPreview();
});

syncTypedPreview();
