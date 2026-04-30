const CONSOLE_WINDOW_MESSAGE_TYPE = "portfolio-console-window";
const CONSOLE_IFRAME_URL = "anx/console.html";
const WINDOW_MARGIN = 16;
const MOBILE_BREAKPOINT = 700;
const MIN_WINDOW_WIDTH = 320;
const MIN_WINDOW_HEIGHT = 230;
const TAB_HEIGHT = 32;
const CONSOLE_WINDOW_BOUNDS_STORAGE_KEY = "portfolio-console-window-bounds";
const CONSOLE_FULLSCREEN_SCROLL_LOCK_CLASS = "console-fullscreen-scroll-lock";

function getViewportBounds() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function shouldInterceptConsoleLinkClick(event) {
  return (
    (event.button === 0 || event.button === undefined) &&
    !event.defaultPrevented &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function getConsoleLinkFromTarget(target) {
  if (!(target instanceof Element)) {
    return null;
  }

  return target.closest(
    '[data-console-open], a[href="anx/console.html"], a[href$="/anx/console.html"]',
  );
}

export function setupConsoleWindow() {
  const consoleLayer = document.getElementById("console-window-layer");
  const consoleWindow = document.getElementById("console-window");
  const consoleIframe = document.getElementById("console-window-iframe");
  const restoreButton = document.getElementById("console-restore-btn");
  const resizeHandles = Array.from(
    consoleWindow?.querySelectorAll("[data-resize-handle]") || [],
  );
  const commandInput =
    consoleIframe?.contentWindow?.document.querySelector(".cmd-input");

  if (!consoleLayer || !consoleWindow || !consoleIframe) {
    return;
  }

  const state = {
    isOpen: false,
    canRestore: false,
    isMaximized: false,
    isMinimized: false,
    isDragging: false,
    isResizing: false,
    iframeLoaded: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    previousNormalRect: null,
    maximizeViewportSnapshot: null,
  };

  let dragSession = null;
  let resizeSession = null;
  let resizePointerId = null;
  let boundsAnimationFrame = null;

  function getCurrentWindowHeight() {
    return state.isMinimized ? TAB_HEIGHT : state.height;
  }

  function syncRestoreButtonVisibility() {
    if (!restoreButton) {
      return;
    }

    restoreButton.hidden = state.isOpen || !state.canRestore;
  }

  function syncFullscreenScrollLock() {
    const shouldLockScroll = state.isOpen && state.isMaximized;

    document.documentElement.classList.toggle(
      CONSOLE_FULLSCREEN_SCROLL_LOCK_CLASS,
      shouldLockScroll,
    );
    document.body.classList.toggle(
      CONSOLE_FULLSCREEN_SCROLL_LOCK_CLASS,
      shouldLockScroll,
    );
  }

  function applyWindowStateClasses() {
    consoleWindow.classList.toggle("is-maximized", state.isMaximized);
    consoleWindow.classList.toggle("is-minimized", state.isMinimized);
    consoleWindow.classList.toggle("is-dragging", state.isDragging);
    consoleWindow.classList.toggle("is-resizing", state.isResizing);
    syncFullscreenScrollLock();
  }

  function clampWindowBounds() {
    const viewport = getViewportBounds();

    state.width = Math.max(
      Math.min(state.width, viewport.width),
      Math.min(MIN_WINDOW_WIDTH, viewport.width),
    );

    const minHeight = Math.min(MIN_WINDOW_HEIGHT, viewport.height);
    state.height = Math.max(Math.min(state.height, viewport.height), minHeight);

    const currentHeight = getCurrentWindowHeight();
    const maxX = Math.max(0, viewport.width - state.width);
    const maxY = Math.max(0, viewport.height - currentHeight);

    state.x = Math.max(0, Math.min(state.x, maxX));
    state.y = Math.max(0, Math.min(state.y, maxY));
  }

  function applyWindowBounds() {
    const viewport = getViewportBounds();

    if (state.isMaximized) {
      consoleWindow.style.left = "0px";
      consoleWindow.style.top = "0px";
      consoleWindow.style.width = `${Math.max(0, viewport.width)}px`;
      consoleWindow.style.height = `${Math.max(0, viewport.height)}px`;
      return;
    }

    clampWindowBounds();
    consoleWindow.style.left = `${state.x}px`;
    consoleWindow.style.top = `${state.y}px`;
    consoleWindow.style.width = `${state.width}px`;
    consoleWindow.style.height = `${getCurrentWindowHeight()}px`;
  }

  function scheduleWindowBoundsApply() {
    if (boundsAnimationFrame !== null) {
      return;
    }

    boundsAnimationFrame = window.requestAnimationFrame(() => {
      boundsAnimationFrame = null;
      applyWindowBounds();
    });
  }

  function ensureDefaultWindowBounds() {
    const viewport = getViewportBounds();

    if (state.width > 0 && state.height > 0) {
      return;
    }

    const isMobile = viewport.width <= MOBILE_BREAKPOINT;

    state.width = isMobile
      ? Math.max(0, viewport.width - WINDOW_MARGIN)
      : Math.min(Math.max(MIN_WINDOW_WIDTH, viewport.width * 0.62), 930);

    state.height = isMobile
      ? Math.max(0, viewport.height - WINDOW_MARGIN)
      : Math.min(Math.max(MIN_WINDOW_HEIGHT, viewport.height * 0.68), 620);

    state.x = Math.max(0, viewport.width - state.width - WINDOW_MARGIN);
    state.y = Math.max(0, viewport.height - state.height - WINDOW_MARGIN);
  }

  function getPersistableWindowRect() {
    const rect =
      state.isMaximized && state.previousNormalRect
        ? state.previousNormalRect
        : {
            x: state.x,
            y: state.y,
            width: state.width,
            height: state.height,
          };

    return {
      x: Number(rect.x),
      y: Number(rect.y),
      width: Number(rect.width),
      height: Number(rect.height),
    };
  }

  function saveWindowBoundsToStorage() {
    const rect = getPersistableWindowRect();

    if (
      !Number.isFinite(rect.x) ||
      !Number.isFinite(rect.y) ||
      !Number.isFinite(rect.width) ||
      !Number.isFinite(rect.height) ||
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      return;
    }

    try {
      localStorage.setItem(
        CONSOLE_WINDOW_BOUNDS_STORAGE_KEY,
        JSON.stringify(rect),
      );
    } catch {}
  }

  function loadWindowBoundsFromStorage() {
    try {
      const rawBounds = localStorage.getItem(CONSOLE_WINDOW_BOUNDS_STORAGE_KEY);
      if (!rawBounds) {
        return;
      }

      const parsedBounds = JSON.parse(rawBounds);
      if (!parsedBounds || typeof parsedBounds !== "object") {
        return;
      }

      const x = Number(parsedBounds.x);
      const y = Number(parsedBounds.y);
      const width = Number(parsedBounds.width);
      const height = Number(parsedBounds.height);

      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0
      ) {
        return;
      }

      state.x = x;
      state.y = y;
      state.width = width;
      state.height = height;
      clampWindowBounds();
    } catch {}
  }

  function focusConsoleInput() {
    try {
      const commandInput =
        consoleIframe.contentDocument?.querySelector(".cmd-input");
      if (commandInput) {
        commandInput.focus();
        return;
      }
    } catch {}
    consoleIframe.focus();
  }

  function openConsoleWindow() {
    ensureDefaultWindowBounds();

    const isFirstLoad = !state.iframeLoaded;

    if (isFirstLoad) {
      consoleIframe.src = CONSOLE_IFRAME_URL;
      state.iframeLoaded = true;
    }

    state.isOpen = true;
    consoleLayer.hidden = false;
    syncRestoreButtonVisibility();
    applyWindowStateClasses();
    applyWindowBounds();

    if (isFirstLoad) {
      consoleIframe.addEventListener(
        "load",
        () => {
          focusConsoleInput();
        },
        { once: true },
      );
    } else {
      focusConsoleInput();
    }
  }

  function closeConsoleWindow(options = {}) {
    const { allowRestore = false } = options;

    state.isOpen = false;
    saveWindowBoundsToStorage();
    state.canRestore = allowRestore;
    state.isDragging = false;
    state.isResizing = false;
    state.isMaximized = false;
    state.isMinimized = false;
    dragSession = null;
    resizeSession = null;
    resizePointerId = null;
    if (boundsAnimationFrame !== null) {
      window.cancelAnimationFrame(boundsAnimationFrame);
      boundsAnimationFrame = null;
    }
    consoleLayer.hidden = true;
    syncRestoreButtonVisibility();
    applyWindowStateClasses();
  }

  function toggleWindowMinimized() {
    if (state.isResizing) {
      return;
    }

    if (state.isMaximized) {
      state.isMaximized = false;
      state.maximizeViewportSnapshot = null;
      if (state.previousNormalRect) {
        state.x = state.previousNormalRect.x;
        state.y = state.previousNormalRect.y;
        state.width = state.previousNormalRect.width;
        state.height = state.previousNormalRect.height;
      }
    }

    state.isMinimized = !state.isMinimized;
    applyWindowStateClasses();
    applyWindowBounds();
  }

  function toggleWindowMaximized() {
    if (state.isResizing) {
      return;
    }

    if (state.isMaximized) {
      state.isMaximized = false;
      if (state.previousNormalRect) {
        const viewport = getViewportBounds();
        const snapshot = state.maximizeViewportSnapshot;
        const widthScale =
          snapshot && snapshot.width > 0 ? viewport.width / snapshot.width : 1;
        const heightScale =
          snapshot && snapshot.height > 0
            ? viewport.height / snapshot.height
            : 1;

        state.x = state.previousNormalRect.x * widthScale;
        state.y = state.previousNormalRect.y * heightScale;
        state.width = state.previousNormalRect.width * widthScale;
        state.height = state.previousNormalRect.height * heightScale;
      }

      state.maximizeViewportSnapshot = null;
      applyWindowStateClasses();
      applyWindowBounds();
      return;
    }

    state.previousNormalRect = {
      x: state.x,
      y: state.y,
      width: state.width,
      height: state.height,
    };
    state.maximizeViewportSnapshot = getViewportBounds();

    state.isMinimized = false;
    state.isMaximized = true;
    applyWindowStateClasses();
    applyWindowBounds();
  }

  function handleWindowAction(action) {
    switch (action) {
      case "tab":
        closeConsoleWindow({ allowRestore: true });
        break;
      case "resize":
        toggleWindowMaximized();
        break;
      case "quit":
        closeConsoleWindow();
        break;
      default:
        break;
    }
  }

  function stopResize() {
    state.isResizing = false;
    resizeSession = null;
    resizePointerId = null;
    applyWindowStateClasses();
  }

  function applyResizeFromPointer(event) {
    if (!resizeSession || event.pointerId !== resizePointerId) {
      return;
    }

    const dx = event.clientX - resizeSession.startClientX;
    const dy = event.clientY - resizeSession.startClientY;
    const direction = resizeSession.direction;
    const start = resizeSession.startRect;

    let nextX = start.x;
    let nextY = start.y;
    let nextWidth = start.width;
    let nextHeight = start.height;

    if (direction.includes("e")) {
      nextWidth = start.width + dx;
    }

    if (direction.includes("s")) {
      nextHeight = start.height + dy;
    }

    if (direction.includes("w")) {
      nextWidth = start.width - dx;
      nextX = start.x + dx;
    }

    if (direction.includes("n")) {
      nextHeight = start.height - dy;
      nextY = start.y + dy;
    }

    const minWidth = Math.min(MIN_WINDOW_WIDTH, window.innerWidth);
    const minHeight = Math.min(MIN_WINDOW_HEIGHT, window.innerHeight);

    if (nextWidth < minWidth) {
      if (direction.includes("w")) {
        nextX -= minWidth - nextWidth;
      }
      nextWidth = minWidth;
    }

    if (nextHeight < minHeight) {
      if (direction.includes("n")) {
        nextY -= minHeight - nextHeight;
      }
      nextHeight = minHeight;
    }

    state.x = nextX;
    state.y = nextY;
    state.width = nextWidth;
    state.height = nextHeight;
    scheduleWindowBoundsApply();
  }

  function startResize(direction, event) {
    if (event.button !== 0 || state.isMaximized || state.isMinimized) {
      return;
    }

    event.preventDefault();
    resizePointerId = event.pointerId;
    resizeSession = {
      direction,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startRect: {
        x: state.x,
        y: state.y,
        width: state.width,
        height: state.height,
      },
    };

    state.isResizing = true;
    applyWindowStateClasses();
    if (event.currentTarget?.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function onConsoleMessage(event) {
    const message = event.data;
    if (!message || message.type !== CONSOLE_WINDOW_MESSAGE_TYPE) {
      return;
    }

    if (
      consoleIframe.contentWindow &&
      event.source !== consoleIframe.contentWindow
    ) {
      return;
    }

    if (!state.isOpen && message.eventName !== "action") {
      return;
    }

    if (message.eventName === "action") {
      handleWindowAction(message.action);
      return;
    }

    if (message.eventName === "drag-start") {
      if (!state.isMaximized && !state.isResizing) {
        state.isDragging = true;
        dragSession = {
          startScreenX: Number(message.screenX) || 0,
          startScreenY: Number(message.screenY) || 0,
          startX: state.x,
          startY: state.y,
        };
        applyWindowStateClasses();
      }
      return;
    }

    if (message.eventName === "drag-end") {
      state.isDragging = false;
      dragSession = null;
      applyWindowStateClasses();
      return;
    }

    if (message.eventName === "drag-move") {
      if (state.isMaximized || !dragSession) {
        return;
      }

      const screenX = Number(message.screenX);
      const screenY = Number(message.screenY);

      if (Number.isNaN(screenX) || Number.isNaN(screenY)) {
        return;
      }

      state.x = dragSession.startX + (screenX - dragSession.startScreenX);
      state.y = dragSession.startY + (screenY - dragSession.startScreenY);
      scheduleWindowBoundsApply();
    }
  }

  function onViewportResize() {
    if (!state.isOpen) {
      return;
    }

    if (state.isMaximized) {
      applyWindowBounds();
      return;
    }

    clampWindowBounds();
    applyWindowBounds();
  }

  document.addEventListener(
    "click",
    (event) => {
      const consoleLink = getConsoleLinkFromTarget(event.target);
      if (!consoleLink) {
        return;
      }

      if (!shouldInterceptConsoleLinkClick(event)) {
        return;
      }

      event.preventDefault();
      openConsoleWindow();
    },
    true,
  );

  for (const handle of resizeHandles) {
    handle.addEventListener("pointerdown", (event) => {
      const direction = handle.getAttribute("data-resize-handle");
      if (!direction) {
        return;
      }

      startResize(direction, event);
    });

    handle.addEventListener("pointermove", applyResizeFromPointer);
    handle.addEventListener("pointerup", (event) => {
      if (event.pointerId === resizePointerId) {
        stopResize();
      }
    });
    handle.addEventListener("pointercancel", (event) => {
      if (event.pointerId === resizePointerId) {
        stopResize();
      }
    });
    handle.addEventListener("lostpointercapture", () => {
      if (resizePointerId !== null) {
        stopResize();
      }
    });
  }

  if (restoreButton) {
    restoreButton.addEventListener("click", () => {
      openConsoleWindow();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (!state.isOpen) {
      return;
    }

    if (event.key === "Escape") {
      closeConsoleWindow();
    }
  });

  window.addEventListener("message", onConsoleMessage);
  window.addEventListener("resize", onViewportResize);
  loadWindowBoundsFromStorage();
  syncRestoreButtonVisibility();
}
