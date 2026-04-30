export function setupTechFinder() {
  const chips = document.querySelectorAll(".tech-chip");
  const techUrls = {
    "HTML":"https://developer.mozilla.org/fr/docs/Web/HTML",
    "CSS":"https://developer.mozilla.org/fr/docs/Web/CSS",
    "JavaScript":"https://developer.mozilla.org/fr/docs/Web/JavaScript",
    "API":"https://developer.mozilla.org/fr/docs/Web/API",
    "Font Awesome":"https://docs.fontawesome.com/",
    "JSON":"https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/JSON",
    "Git":"https://git-scm.com/docs",
    "VS Code":"https://code.visualstudio.com/docs",
    "I18N":"https://www.i18next.com/",
    "Python":"https://www.python.org/",
    "FFMPEG":"https://ffmpeg.org/about.html",
    "FFPROBE":"https://ffmpeg.org/ffprobe.html",
    "TypeScript":"https://www.typescriptlang.org/",
    "Flask":"https://pypi.org/project/Flask/",
  }

  function getTechUrl(chip) {
    let techName = chip.textContent || chip.innerHTML;
    let matchingUrl = techUrls[techName];
    return matchingUrl;
  }

  function applyUrl(chip) {
    chip.addEventListener("click", (event) => {
        let currentChipUrl = getTechUrl(chip);
        if (currentChipUrl) {
          window.open(currentChipUrl, "_blank").focus();
        }
      });
  }
  chips.forEach((chip) => applyUrl(chip));
}
