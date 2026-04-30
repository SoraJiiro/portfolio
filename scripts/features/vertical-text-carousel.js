export function setupVerticalTextCarousel(rootId, items) {
  const REBOOT_RESTORED_EVENT = "portfolio-reboot-restored";
  const rootElement = document.getElementById(rootId);

  if (!rootElement || !Array.isArray(items) || items.length === 0) {
    return;
  }

  const PAUSE_MS = 1000;
  const TRANSITION_MS = 480;

  const viewportElement = document.createElement("span");
  viewportElement.className = "langages-viewport";

  const trackElement = document.createElement("span");
  trackElement.className = "langages-track";

  for (const itemLabel of items) {
    const item = document.createElement("span");
    item.className = "langages-item";
    item.innerHTML = itemLabel;
    trackElement.appendChild(item);
  }

  const loopClone = document.createElement("span");
  loopClone.className = "langages-item";
  loopClone.innerHTML = items[0];
  trackElement.appendChild(loopClone);

  viewportElement.appendChild(trackElement);
  rootElement.replaceChildren(viewportElement);

  const firstItem = trackElement.querySelector(".langages-item");
  if (!firstItem) {
    return;
  }

  let currentIndex = 0;
  let pendingStepTimeout = null;
  let loopResetHandler = null;

  const getItemHeight = () => {
    const measuredHeight = firstItem.getBoundingClientRect().height;
    return measuredHeight > 0 ? measuredHeight : 20;
  };

  const moveToIndex = (index, animated) => {
    trackElement.style.transition = animated
      ? `transform ${TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
      : "none";
    trackElement.style.transform = `translateY(-${index * getItemHeight()}px)`;
  };

  const scheduleNextStep = (delay) => {
    pendingStepTimeout = setTimeout(stepForward, delay);
  };

  const clearPendingStep = () => {
    if (pendingStepTimeout) {
      clearTimeout(pendingStepTimeout);
      pendingStepTimeout = null;
    }
  };

  const clearLoopResetHandler = () => {
    if (loopResetHandler) {
      trackElement.removeEventListener("transitionend", loopResetHandler);
      loopResetHandler = null;
    }
  };

  const stepForward = () => {
    pendingStepTimeout = null;

    if (!rootElement.isConnected) {
      return;
    }

    currentIndex += 1;
    moveToIndex(currentIndex, true);

    if (currentIndex === items.length) {
      clearLoopResetHandler();
      loopResetHandler = () => {
        trackElement.removeEventListener("transitionend", loopResetHandler);
        loopResetHandler = null;
        currentIndex = 0;
        moveToIndex(currentIndex, false);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scheduleNextStep(PAUSE_MS);
          });
        });
      };

      trackElement.addEventListener("transitionend", loopResetHandler);
      return;
    }

    scheduleNextStep(TRANSITION_MS + PAUSE_MS);
  };

  const restartFromCurrentIndex = () => {
    if (!rootElement.isConnected) {
      return;
    }

    clearPendingStep();
    clearLoopResetHandler();
    moveToIndex(currentIndex, false);
    scheduleNextStep(PAUSE_MS);
  };

  const restartOnNextFrame = () => {
    requestAnimationFrame(() => {
      restartFromCurrentIndex();
    });
  };

  moveToIndex(0, false);
  scheduleNextStep(PAUSE_MS);

  window.addEventListener("resize", () => {
    restartFromCurrentIndex();
  });

  window.addEventListener(REBOOT_RESTORED_EVENT, () => {
    restartOnNextFrame();
  });
}
