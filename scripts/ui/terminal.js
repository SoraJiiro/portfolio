const TERMINAL_SKIP_STORAGE_KEY = "terminalSkip";
const HEADER_REVEAL_FALLBACK_MS = 2700;
const FINALIZE_DELAY_MS = 400;
const NEXT_LINE_DELAY_MS = 340;
const TYPE_DELAY_BASE_MS = 21;
const TYPE_DELAY_RANDOM_MS = 18;
const DOT_DELAY_MULTIPLIER = 8;

window.addEventListener("DOMContentLoaded", () => {
  const language = getSavedLanguage() || navigator.language.substring(0, 2);
  const terminalCopy = getTerminalCopy(language);
  const terminalLines = terminalCopy.lines;

  const terminal = createTerminal(getCommandTimestamp(), terminalCopy.title);
  const content = terminal.querySelector("#terminal-content");
  const terminalBar = terminal.querySelector(".terminal-bar");
  const header = document.querySelector(".header");
  const siteFade = document.getElementById("site-fade");

  if (!content) {
    return;
  }

  document.body.appendChild(terminal);
  document.body.classList.add("no-scroll");

  hideMainSiteUntilIntroFinishes(siteFade, header);

  const state = {
    currentLineIndex: 0,
    currentCharIndex: 0,
    activeLineNode: null,
    activeLineTimestamp: "",
    isFinished: false,
    endTimeoutId: null,
    revealHeaderTimeoutId: null,
  };

  if (isTerminalIntroSkipped()) {
    finishIntro(true);
    return;
  }

  const skipButton = createSkipButton(terminalCopy, () => {
    persistTerminalIntroSkip();
    finishIntro(true);
  });

  if (terminalBar) {
    terminalBar.append(skipButton);
  }

  renderNextLine();

  state.revealHeaderTimeoutId = setTimeout(() => {
    if (!state.isFinished) {
      revealHeader();
    }
  }, HEADER_REVEAL_FALLBACK_MS);

  function renderNextLine() {
    if (state.isFinished) {
      return;
    }

    if (state.currentLineIndex >= terminalLines.length) {
      state.endTimeoutId = setTimeout(() => {
        finishIntro(false);
      }, FINALIZE_DELAY_MS);
      return;
    }

    const lineNode = document.createElement("div");
    lineNode.className = "terminal-line";
    content.append(lineNode);

    state.activeLineNode = lineNode;
    state.currentCharIndex = 0;
    state.activeLineTimestamp = getCurrentTimestamp();

    renderNextCharacter();
  }

  function renderNextCharacter() {
    if (state.isFinished || !state.activeLineNode) {
      return;
    }

    const currentLine = terminalLines[state.currentLineIndex];
    if (typeof currentLine !== "string") {
      finishIntro(false);
      return;
    }

    if (state.currentCharIndex < currentLine.length) {
      const visibleText = currentLine.slice(0, state.currentCharIndex + 1);
      const hasMoreCharacters = state.currentCharIndex + 1 < currentLine.length;

      state.activeLineNode.innerHTML = createTerminalLineMarkup(
        state.activeLineTimestamp,
        visibleText,
        hasMoreCharacters,
      );

      state.currentCharIndex += 1;

      const lastTypedCharacter = currentLine[state.currentCharIndex - 1];
      setTimeout(renderNextCharacter, getTypingDelay(lastTypedCharacter));
      return;
    }

    state.activeLineNode.innerHTML = createTerminalLineMarkup(
      state.activeLineTimestamp,
      currentLine,
      false,
    );

    state.currentLineIndex += 1;
    setTimeout(renderNextLine, NEXT_LINE_DELAY_MS);
  }

  function finishIntro(isSkipped) {
    if (state.isFinished) {
      return;
    }

    state.isFinished = true;
    clearTimeout(state.endTimeoutId);
    clearTimeout(state.revealHeaderTimeoutId);

    if (isSkipped) {
      content.innerHTML = renderAllTerminalLines(terminalLines);
    }

    revealHeader();

    if (siteFade) {
      siteFade.classList.add("visible");
    }

    window.dispatchEvent(new Event("portfolio-site-visible"));

    terminal.classList.add("hide");
    setTimeout(() => {
      terminal.remove();
      document.body.classList.remove("no-scroll");
    }, FINALIZE_DELAY_MS);
  }

  function revealHeader() {
    if (!header) {
      return;
    }

    header.style.transition = "opacity 0.7s";
    header.style.opacity = "1";
  }
});

function hideMainSiteUntilIntroFinishes(siteFade, header) {
  if (siteFade) {
    siteFade.classList.remove("visible");
  }

  if (header) {
    header.style.opacity = "0";
  }
}

function createSkipButton(terminalCopy, onSkip) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "terminal-skip-btn";
  button.textContent = "\u00d7";
  button.title = terminalCopy.skipIntroTitle;
  button.setAttribute("aria-label", terminalCopy.skipIntroAria);
  button.addEventListener("click", onSkip);
  return button;
}

function getTypingDelay(lastTypedCharacter) {
  let delay = TYPE_DELAY_BASE_MS + Math.random() * TYPE_DELAY_RANDOM_MS;
  if (lastTypedCharacter === ".") {
    delay *= DOT_DELAY_MULTIPLIER;
  }
  return delay;
}

function createTerminalLineMarkup(timestamp, text, withCursor) {
  return (
    "<span style='color:var(--text);opacity:0.7;'>" +
    timestamp +
    "</span> " +
    text +
    (withCursor ? "<span class='terminal-cursor'></span>" : "")
  );
}

function renderAllTerminalLines(lines) {
  return lines
    .map((line) => {
      return (
        "<div class='terminal-line'>" +
        createTerminalLineMarkup(getCurrentTimestamp(), line, false) +
        "</div>"
      );
    })
    .join("");
}

function isTerminalIntroSkipped() {
  return localStorage.getItem(TERMINAL_SKIP_STORAGE_KEY) === "true";
}

function persistTerminalIntroSkip() {
  localStorage.setItem(TERMINAL_SKIP_STORAGE_KEY, "true");
}

function createTerminal(commandTime, terminalTitle) {
  const terminal = document.createElement("div");
  terminal.className = "terminal-launch";
  terminal.innerHTML = `
    <div class="terminal-bar">
      <div class="terminal-title">${terminalTitle}</div>
    </div>
    <div id="terminal-content">
      <div class="terminal-cmd terminal-line"><span style="color:var(--text);opacity:0.7;">${commandTime}</span> - Admin@KA:~$ node /home/usr1/projets/portfolio/app.js</div>
    </div>`;
  return terminal;
}

function getSavedLanguage() {
  const savedLanguage = localStorage.getItem("portfolio-language");

  if (savedLanguage === "en" || savedLanguage === "fr") {
    return savedLanguage;
  }

  if (document.documentElement.lang.toLowerCase().startsWith("en")) {
    return "en";
  }

  return (navigator.language || "fr").toLowerCase().startsWith("en")
    ? "en"
    : "fr";
}

function getTerminalCopy(language) {
  if (language === "en") {
    return {
      title: "Terminal - Portfolio",
      skipIntroTitle: "Skip intro (permanent)",
      skipIntroAria: "Skip terminal introduction permanently",
      lines: [
        "- [BOOT] Initialization ...",
        "- [LOAD] Loading information ...",
        "- [LOG] Connecting ...",
        "- [SUCCESS] Welcome to my portfolio!",
      ],
    };
  }

  return {
    title: "Terminal - Portfolio",
    skipIntroTitle: "Passer l'intro (permanent)",
    skipIntroAria: "Passer l'introduction terminal de facon permanente",
    lines: [
      "- [BOOT] Initialisation ...",
      "- [LOAD] Chargement des infos ...",
      "- [LOG] Connexion ...",
      "- [SUCCESS] Bienvenue sur mon portfolio !",
    ],
  };
}

function getCurrentTimestamp() {
  const now = new Date();
  return formatTimestamp(now.getHours(), now.getMinutes(), now.getSeconds());
}

function formatTimestamp(hours, minutes, seconds) {
  return (
    "[" +
    String(hours).padStart(2, "0") +
    ":" +
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0") +
    "]"
  );
}

function getCommandTimestamp() {
  const now = new Date();
  const previousSecond = (now.getSeconds() + 59) % 60;
  return formatTimestamp(now.getHours(), now.getMinutes(), previousSecond);
}
