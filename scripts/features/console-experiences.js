const MATRIX_OVERLAY_ID = "console-matrix-overlay";
const FLAPPY_OVERLAY_ID = "console-flappy-overlay";

export function getMatrixExperienceCopy(t) {
  return {
    title: t("console.matrix.title"),
    closeLabel: t("console.matrix.close"),
  };
}

export function getFlappyExperienceCopy(t) {
  return {
    title: t("console.flappy.title"),
    startLabel: t("console.flappy.start"),
    gameOverLabel: t("console.flappy.gameOver"),
    scoreLabel: t("console.flappy.score"),
    bestLabel: t("console.flappy.best"),
    closeLabel: t("console.flappy.close"),
  };
}

function applyStyles(element, styles) {
  Object.assign(element.style, styles);
}

function parseColorToRgb(value) {
  const color = (value || "").trim();

  if (color.startsWith("#")) {
    if (color.length === 4) {
      return [
        parseInt(color[1] + color[1], 16),
        parseInt(color[2] + color[2], 16),
        parseInt(color[3] + color[3], 16),
      ];
    }

    if (color.length >= 7) {
      return [
        parseInt(color.slice(1, 3), 16),
        parseInt(color.slice(3, 5), 16),
        parseInt(color.slice(5, 7), 16),
      ];
    }
  }

  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
  }

  return [57, 255, 20];
}

function getExperiencePalette() {
  const styles = getComputedStyle(document.body);
  const [r, g, b] = parseColorToRgb(styles.getPropertyValue("--text"));
  const [bgR, bgG, bgB] = parseColorToRgb(styles.getPropertyValue("--bg"));
  const isLightTheme = document.body.classList.contains("theme-light");

  return {
    accent: `rgb(${r}, ${g}, ${b})`,
    accentSoft: `rgba(${r}, ${g}, ${b}, 0.78)`,
    accentBorder: `rgba(${r}, ${g}, ${b}, 0.62)`,
    overlayBg: isLightTheme
      ? `rgba(${bgR}, ${bgG}, ${bgB}, 0.94)`
      : "rgba(0, 0, 0, 0.96)",
    closeBg: isLightTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
    panelBg: isLightTheme
      ? `rgba(${bgR}, ${bgG}, ${bgB}, 0.96)`
      : "rgba(0, 17, 4, 0.96)",
    hintBg: isLightTheme ? "rgba(255, 255, 255, 0.72)" : "rgba(0, 0, 0, 0.5)",
    matrixTrail: isLightTheme
      ? "rgba(244, 248, 255, 0.22)"
      : "rgba(0, 0, 0, 0.09)",
    canvasBg: isLightTheme ? "rgba(240, 246, 255, 1)" : "#001104",
    birdColor: isLightTheme ? "rgba(25, 45, 76, 0.95)" : "#d8ffcf",
  };
}

function createOverlay(id, palette) {
  const overlay = document.createElement("div");
  overlay.id = id;
  applyStyles(overlay, {
    position: "fixed",
    inset: "0",
    zIndex: "9999",
    background: palette.overlayBg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Ubuntu Mono', monospace",
  });
  return overlay;
}

function createCloseButton(label, onClose, palette) {
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = label;
  applyStyles(closeButton, {
    position: "absolute",
    top: "16px",
    right: "16px",
    padding: "8px 12px",
    border: `1px solid ${palette.accentBorder}`,
    background: palette.closeBg,
    color: palette.accent,
    cursor: "pointer",
  });
  closeButton.addEventListener("click", onClose);
  return closeButton;
}

export function launchMatrixExperience(copy) {
  if (document.getElementById(MATRIX_OVERLAY_ID)) {
    return "already-running";
  }

  const palette = getExperiencePalette();
  const overlay = createOverlay(MATRIX_OVERLAY_ID, palette);
  const title = document.createElement("div");
  title.textContent = copy.title;
  title.style.position = "absolute";
  title.style.top = "16px";
  title.style.left = "16px";
  title.style.color = palette.accent;
  title.style.letterSpacing = "0.08em";

  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  overlay.appendChild(canvas);
  overlay.appendChild(title);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return "failed";
  }

  let animationId = 0;
  let lastFrameTime = 0;
  const MATRIX_FRAME_INTERVAL_MS = 60;
  const MATRIX_FALL_SPEED = 24;
  const chars = "ABCDEFGポをづガ゜べアツドヂヹヾヮルボポゟロウゴ0123456789#%*";
  let drops = [];
  let fontSize = 16;
  let columns = 0;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = Math.max(1, Math.floor(canvas.width / fontSize));
    drops = new Array(columns).fill(0).map(() => Math.random() * -80);
  }

  function draw(timestamp) {
    if (typeof timestamp !== "number") {
      animationId = requestAnimationFrame(draw);
      return;
    }

    if (!lastFrameTime) {
      lastFrameTime = timestamp;
    }

    const elapsedMs = timestamp - lastFrameTime;
    if (elapsedMs < MATRIX_FRAME_INTERVAL_MS) {
      animationId = requestAnimationFrame(draw);
      return;
    }

    const dt = elapsedMs / 1000;
    lastFrameTime = timestamp;

    ctx.fillStyle = palette.matrixTrail;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = palette.accent;
    ctx.font = `${fontSize}px 'Ubuntu Mono', monospace`;

    for (let i = 0; i < drops.length; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)] + " ";
      const x = i * fontSize;
      const y = drops[i] * fontSize;

      ctx.fillText(char, x, y);

      if (y > canvas.height && Math.random() > 0.985) {
        drops[i] = 0;
      } else {
        drops[i] += MATRIX_FALL_SPEED * dt;
      }
    }

    animationId = requestAnimationFrame(draw);
  }

  const close = () => {
    cancelAnimationFrame(animationId);
    window.removeEventListener("resize", resize);
    window.removeEventListener("keydown", onKeyDown);
    overlay.remove();
  };

  function onKeyDown(event) {
    if (event.key === "Escape") {
      close();
    }
  }

  const closeButton = createCloseButton(copy.closeLabel, close, palette);
  overlay.appendChild(closeButton);

  document.body.appendChild(overlay);
  window.addEventListener("resize", resize);
  window.addEventListener("keydown", onKeyDown);
  resize();
  animationId = requestAnimationFrame(draw);

  return "started";
}

export function launchFlappyExperience(copy) {
  if (document.getElementById(FLAPPY_OVERLAY_ID)) {
    return "already-running";
  }

  const palette = getExperiencePalette();
  const overlay = createOverlay(FLAPPY_OVERLAY_ID, palette);
  const panel = document.createElement("div");
  applyStyles(panel, {
    width: "min(96vw, 560px, calc(92vh * 7 / 11))",
    aspectRatio: "7 / 11",
    border: `1px solid ${palette.accentBorder}`,
    background: palette.panelBg,
    position: "relative",
    boxShadow: `0 0 24px ${palette.accentSoft}`,
  });

  const title = document.createElement("div");
  title.textContent = copy.title;
  title.style.position = "absolute";
  title.style.top = "10px";
  title.style.left = "12px";
  title.style.color = palette.accentSoft;
  title.style.fontSize = "14px";
  title.style.zIndex = "2";

  const hud = document.createElement("div");
  hud.style.position = "absolute";
  hud.style.top = "10px";
  hud.style.right = "12px";
  hud.style.color = palette.accentSoft;
  hud.style.fontSize = "14px";
  hud.style.textAlign = "right";
  hud.style.zIndex = "2";

  const hint = document.createElement("div");
  hint.style.position = "absolute";
  hint.style.left = "50%";
  hint.style.top = "50%";
  hint.style.transform = "translate(-50%, -50%)";
  hint.style.color = palette.accent;
  hint.style.textAlign = "center";
  hint.style.padding = "10px 12px";
  hint.style.border = `1px solid ${palette.accentBorder}`;
  hint.style.background = palette.hintBg;
  hint.style.zIndex = "2";

  const canvas = document.createElement("canvas");
  canvas.width = 500;
  canvas.height = 786;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";

  panel.appendChild(canvas);
  panel.appendChild(title);
  panel.appendChild(hud);
  panel.appendChild(hint);
  overlay.appendChild(panel);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return "failed";
  }

  let animationId = 0;
  let lastFrameTime = 0;
  let bestScore = parseInt(localStorage.getItem("flappy-best-score")) || 0;

  const state = {
    started: false,
    gameOver: false,
    score: 0,
    birdY: canvas.height * 0.5,
    birdVelocity: 0,
    birdRadius: 12,
    gravity: 980,
    jumpVelocity: -320,
    pipeSpeed: 170,
    pipeWidth: 58,
    pipeGap: 170,
    pipeSpacing: 240,
    pipes: [],
  };

  function resetGame() {
    state.started = false;
    state.gameOver = false;
    state.score = 0;
    state.birdY = canvas.height * 0.5;
    state.birdVelocity = 0;
    state.pipes = [];
    let x = canvas.width + 120;
    for (let i = 0; i < 4; i++) {
      state.pipes.push(createPipe(x));
      x += state.pipeSpacing;
    }
    hint.textContent = copy.startLabel;
    hint.style.display = "block";
    updateHud();
  }

  function createPipe(x) {
    const margin = 70;
    const minGapY = margin + state.pipeGap / 2;
    const maxGapY = canvas.height - margin - state.pipeGap / 2;
    const gapY = minGapY + Math.random() * (maxGapY - minGapY);
    return {
      x,
      gapY,
      passed: false,
    };
  }

  function updateHud() {
    hud.textContent = `${copy.scoreLabel}: ${state.score}\n${copy.bestLabel}: ${bestScore}`;
    hud.style.whiteSpace = "pre";
  }

  function jump() {
    if (!state.started) {
      state.started = true;
      hint.style.display = "none";
    }

    if (state.gameOver) {
      resetGame();
      return;
    }

    state.birdVelocity = state.jumpVelocity;
  }

  function update(dt) {
    if (!state.started || state.gameOver) {
      return;
    }

    state.birdVelocity += state.gravity * dt;
    state.birdY += state.birdVelocity * dt;

    if (
      state.birdY + state.birdRadius >= canvas.height ||
      state.birdY - state.birdRadius <= 0
    ) {
      triggerGameOver();
      return;
    }

    for (const pipe of state.pipes) {
      pipe.x -= state.pipeSpeed * dt;

      if (!pipe.passed && pipe.x + state.pipeWidth < canvas.width * 0.25) {
        pipe.passed = true;
        state.score += 1;
        bestScore = Math.max(bestScore, state.score);
        localStorage.setItem("flappy-best-score", bestScore);
        updateHud();
      }

      if (pipe.x + state.pipeWidth < 0) {
        const farthest = Math.max(...state.pipes.map((p) => p.x));
        const recycled = createPipe(farthest + state.pipeSpacing);
        pipe.x = recycled.x;
        pipe.gapY = recycled.gapY;
        pipe.passed = false;
      }

      const inPipeX =
        canvas.width * 0.25 + state.birdRadius > pipe.x &&
        canvas.width * 0.25 - state.birdRadius < pipe.x + state.pipeWidth;

      const inPipeY =
        state.birdY - state.birdRadius < pipe.gapY - state.pipeGap / 2 ||
        state.birdY + state.birdRadius > pipe.gapY + state.pipeGap / 2;

      if (inPipeX && inPipeY) {
        triggerGameOver();
        return;
      }
    }
  }

  function triggerGameOver() {
    state.gameOver = true;
    hint.textContent = copy.gameOverLabel;
    hint.style.display = "block";
  }

  function draw() {
    ctx.fillStyle = palette.canvasBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const pipe of state.pipes) {
      ctx.fillStyle = palette.accent;
      const topHeight = pipe.gapY - state.pipeGap / 2;
      const bottomY = pipe.gapY + state.pipeGap / 2;
      const bottomHeight = canvas.height - bottomY;

      ctx.fillRect(pipe.x, 0, state.pipeWidth, topHeight);
      ctx.fillRect(pipe.x, bottomY, state.pipeWidth, bottomHeight);
    }

    ctx.beginPath();
    ctx.arc(canvas.width * 0.25, state.birdY, state.birdRadius, 0, Math.PI * 2);
    ctx.fillStyle = palette.birdColor;
    ctx.fill();
  }

  function loop(timestamp) {
    if (!lastFrameTime) {
      lastFrameTime = timestamp;
    }
    const dt = Math.min(0.033, (timestamp - lastFrameTime) / 1000);
    lastFrameTime = timestamp;

    update(dt);
    draw();
    animationId = requestAnimationFrame(loop);
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      close();
      return;
    }

    if (event.code === "Space" || event.key === "ArrowUp") {
      event.preventDefault();
      jump();
    }
  }

  function onPointerDown() {
    jump();
  }

  const close = () => {
    cancelAnimationFrame(animationId);
    window.removeEventListener("keydown", onKeyDown);
    canvas.removeEventListener("pointerdown", onPointerDown);
    overlay.remove();
  };

  const closeButton = createCloseButton(copy.closeLabel, close, palette);
  overlay.appendChild(closeButton);

  document.body.appendChild(overlay);
  window.addEventListener("keydown", onKeyDown);
  canvas.addEventListener("pointerdown", onPointerDown);

  resetGame();
  animationId = requestAnimationFrame(loop);

  return "started";
}
