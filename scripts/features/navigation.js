const MOBILE_NAV_BREAKPOINT = 800;
const NAV_HIDE_SCROLL_THRESHOLD = 92;
const NAV_HIDE_SCROLL_DELTA = 8;

export function setupAutoHideNavigation() {
  const navContainer = document.querySelector(".main-nav");

  if (!navContainer) {
    return;
  }

  let lastScrollY = window.scrollY;
  const setNavigationVisible = (isVisible) => {
    navContainer.classList.toggle("nav-hidden", !isVisible);
  };

  window.addEventListener(
    "scroll",
    () => {
      const currentScrollY = window.scrollY;
      const isMenuOpen = navContainer.classList.contains("menu-open");

      if (isMenuOpen || currentScrollY <= NAV_HIDE_SCROLL_THRESHOLD) {
        setNavigationVisible(true);
        lastScrollY = currentScrollY;
        return;
      }

      if (currentScrollY > lastScrollY + NAV_HIDE_SCROLL_DELTA) {
        setNavigationVisible(false);
      } else if (currentScrollY < lastScrollY - NAV_HIDE_SCROLL_DELTA) {
        setNavigationVisible(true);
      }

      lastScrollY = currentScrollY;
    },
    { passive: true },
  );

  window.addEventListener("resize", () => {
    if (window.innerWidth <= MOBILE_NAV_BREAKPOINT) {
      setNavigationVisible(true);
    }
  });
}

export function setupMobileNavigation() {
  const navContainer = document.querySelector(".main-nav");
  const navToggleBtn = document.querySelector(".nav-toggle-btn");
  const navMenu = document.getElementById("main-menu");
  const navLinks = document.querySelectorAll(".main-nav ul a");

  if (!navContainer || !navToggleBtn || !navMenu || navLinks.length === 0) {
    return;
  }

  const setMenuOpen = (isOpen) => {
    navContainer.classList.toggle("menu-open", isOpen);
    navToggleBtn.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("menu-open-scroll-lock", isOpen);

    if (isOpen) {
      navContainer.classList.remove("nav-hidden");
    }
  };

  const isMenuOpen = () => navContainer.classList.contains("menu-open");

  const closeMenuIfOpen = () => {
    if (isMenuOpen()) {
      setMenuOpen(false);
    }
  };

  navToggleBtn.addEventListener("click", () => {
    setMenuOpen(!isMenuOpen());
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", closeMenuIfOpen);
  });

  document.addEventListener("click", (event) => {
    if (!isMenuOpen()) {
      return;
    }

    const clickedInsideMenu = navMenu.contains(event.target);
    const clickedToggle = navToggleBtn.contains(event.target);
    if (!clickedInsideMenu && !clickedToggle) {
      setMenuOpen(false);
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > MOBILE_NAV_BREAKPOINT) {
      closeMenuIfOpen();
    }
  });
}
