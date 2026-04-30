window.addEventListener("DOMContentLoaded", () => {
  const siteFade = document.getElementById("site-fade");
  const SECTIONS_SELECTOR = ".content-section";
  const INITIAL_FADE_TARGETS_SELECTOR =
    ".main-nav nav, .header > div, .header .title h1, .header p, .header li, " +
    ".title h1, .section-heading h2, " +
    ".section-heading p, .project-card p, .hobby-card p, .contact-card p, " +
    ".project-card, .hobby-card, .contact-card";
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const motionDistanceScale = prefersReducedMotion ? 0.55 : 1;
  const motionDurationScale = prefersReducedMotion ? 0.75 : 1;
  let hasStarted = false;
  const animatedSections = new WeakSet();
  const pendingSectionAnimations = [];
  const sectionBatchSize = prefersReducedMotion ? 1 : 2;
  const sectionBatchDelayMs = prefersReducedMotion ? 60 : 130;
  let sectionBatchScheduled = false;

  const scaledDistance = (value) => Math.round(value * motionDistanceScale);
  const scaledDuration = (value) => Math.round(value * motionDurationScale);
  const sectionRevealDelayBase = scaledDuration(
    prefersReducedMotion ? 70 : 190,
  );

  const queryAll = (selector, root = document) => {
    return Array.from(root.querySelectorAll(selector));
  };

  const setWillChange = (targets) => {
    for (const target of targets) {
      target.style.willChange = "transform, opacity";
    }
  };

  const clearWillChange = (targets) => {
    for (const target of targets) {
      target.style.willChange = "";
    }
  };

  const clearAnimationInlineStyles = (targets) => {
    for (const target of targets) {
      target.style.transform = "";
    }
  };

  const runAnimeWithCleanup = ({ targets, complete, ...animationConfig }) => {
    if (!targets || targets.length === 0) {
      if (typeof complete === "function") {
        complete();
      }
      return;
    }

    setWillChange(targets);
    anime({
      targets,
      ...animationConfig,
      complete: () => {
        clearWillChange(targets);
        clearAnimationInlineStyles(targets);
        if (typeof complete === "function") {
          complete();
        }
      },
    });
  };

  const setInitialOpacityState = () => {
    const targets = queryAll(INITIAL_FADE_TARGETS_SELECTOR);
    for (const target of targets) {
      target.style.opacity = "0";
    }
  };

  const revealAllTargets = () => {
    const targets = queryAll(INITIAL_FADE_TARGETS_SELECTOR);
    for (const target of targets) {
      target.style.opacity = "1";
    }
  };

  const animateSection = (section) => {
    if (!section || animatedSections.has(section)) {
      return;
    }

    animatedSections.add(section);

    const directBlocks = queryAll(":scope > div", section);
    const titleTargets = queryAll(".title h1, .section-heading h2", section);
    const cardTargets = queryAll(
      ".project-card, .hobby-card, .contact-card",
      section,
    );
    const textTargets = queryAll(
      ".section-heading p, .project-card p, .hobby-card p, .contact-card p",
      section,
    );

    const animateDirectBlocks =
      cardTargets.length === 0 && textTargets.length === 0;

    if (!animateDirectBlocks && directBlocks.length > 0) {
      for (const block of directBlocks) {
        block.style.opacity = "1";
      }
    }

    if (animateDirectBlocks && directBlocks.length > 0) {
      runAnimeWithCleanup({
        targets: directBlocks,
        translateY: [scaledDistance(24), 0],
        opacity: [0, 1],
        duration: scaledDuration(760),
        easing: "easeOutCubic",
        delay: anime.stagger(scaledDuration(82), {
          start: sectionRevealDelayBase,
        }),
      });
    }

    if (titleTargets.length > 0) {
      runAnimeWithCleanup({
        targets: titleTargets,
        translateY: [-scaledDistance(20), 0],
        opacity: [0, 1],
        duration: scaledDuration(680),
        easing: "easeOutExpo",
        delay: anime.stagger(scaledDuration(58), {
          start: sectionRevealDelayBase + scaledDuration(80),
        }),
      });
    }

    if (textTargets.length > 0) {
      runAnimeWithCleanup({
        targets: textTargets,
        translateY: [scaledDistance(16), 0],
        opacity: [0, 1],
        duration: scaledDuration(620),
        easing: "easeOutCubic",
        delay: anime.stagger(scaledDuration(44), {
          start: sectionRevealDelayBase + scaledDuration(130),
        }),
      });
    }

    if (cardTargets.length > 0) {
      runAnimeWithCleanup({
        targets: cardTargets,
        translateY: [scaledDistance(18), 0],
        scale: [0.992, 1],
        opacity: [0, 1],
        duration: scaledDuration(740),
        easing: "easeOutCubic",
        delay: anime.stagger(scaledDuration(68), {
          start: sectionRevealDelayBase + scaledDuration(170),
        }),
      });
    }
  };

  const flushSectionAnimationQueue = () => {
    const nextBatch = pendingSectionAnimations.splice(0, sectionBatchSize);

    for (const section of nextBatch) {
      animateSection(section);
    }

    if (pendingSectionAnimations.length === 0) {
      sectionBatchScheduled = false;
      return;
    }

    setTimeout(() => {
      requestAnimationFrame(flushSectionAnimationQueue);
    }, sectionBatchDelayMs);
  };

  const queueSectionAnimation = (section) => {
    if (
      !section ||
      animatedSections.has(section) ||
      pendingSectionAnimations.includes(section)
    ) {
      return;
    }

    pendingSectionAnimations.push(section);

    if (sectionBatchScheduled) {
      return;
    }

    sectionBatchScheduled = true;
    requestAnimationFrame(flushSectionAnimationQueue);
  };

  const setupSectionObserver = () => {
    const sections = queryAll(SECTIONS_SELECTOR);

    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          queueSectionAnimation(entry.target);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -4% 0px",
      },
    );

    for (const section of sections) {
      observer.observe(section);
    }
  };

  const runAnimations = () => {
    if (hasStarted) {
      return;
    }
    hasStarted = true;

    if (typeof anime !== "function") {
      revealAllTargets();
      return;
    }

    const mainNavTargets = queryAll(".main-nav nav");
    const headerBlockTargets = queryAll(".header > div");
    const headerTitleTargets = queryAll(".header .title h1");
    const headerTextTargets = queryAll(".header p, .header li");

    runAnimeWithCleanup({
      targets: mainNavTargets,
      translateY: [-scaledDistance(16), 0],
      opacity: [0, 1],
      duration: scaledDuration(650),
      easing: "easeOutExpo",
      delay: scaledDuration(90),
    });

    runAnimeWithCleanup({
      targets: headerBlockTargets,
      translateY: [scaledDistance(26), 0],
      opacity: [0, 1],
      duration: scaledDuration(920),
      easing: "easeOutCubic",
      delay: anime.stagger(scaledDuration(130), { start: scaledDuration(210) }),
    });

    runAnimeWithCleanup({
      targets: headerTitleTargets,
      translateY: [-scaledDistance(18), 0],
      opacity: [0, 1],
      duration: scaledDuration(760),
      easing: "easeOutExpo",
      delay: anime.stagger(scaledDuration(90), { start: scaledDuration(320) }),
    });

    runAnimeWithCleanup({
      targets: headerTextTargets,
      translateY: [scaledDistance(14), 0],
      opacity: [0, 1],
      duration: scaledDuration(760),
      easing: "easeOutCubic",
      delay: anime.stagger(scaledDuration(28), { start: scaledDuration(500) }),
    });

    setupSectionObserver();

    const initiallyVisibleSections = queryAll(SECTIONS_SELECTOR);

    for (const section of initiallyVisibleSections) {
      const sectionTop = section.getBoundingClientRect().top;
      if (sectionTop < window.innerHeight * 0.72) {
        queueSectionAnimation(section);
      }
    }
  };

  setInitialOpacityState();

  const shouldRunImmediately =
    !siteFade || siteFade.classList.contains("visible");
  if (shouldRunImmediately) {
    runAnimations();
    return;
  }

  const observer = new MutationObserver(() => {
    if (siteFade.classList.contains("visible")) {
      observer.disconnect();
      runAnimations();
    }
  });

  observer.observe(siteFade, { attributes: true, attributeFilter: ["class"] });
});
