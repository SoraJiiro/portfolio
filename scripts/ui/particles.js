(function () {
  const canvas = document.getElementById("particles-bg");
  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const MAX_PARTICLES = 256;
  const ANTI_LAG_FACTOR = 0.175;
  const BASE_PARTICLE_COUNT = Math.floor(MAX_PARTICLES * ANTI_LAG_FACTOR);
  const REFERENCE_AREA = 1920 * 1080;
  const MIN_PARTICLE_COUNT = 24;
  const DEFAULT_CONNECTION_DISTANCE = 90;
  const MIN_CONNECTION_DISTANCE = 68;
  const MAX_CONNECTION_DISTANCE = 112;
  const PARTICLE_SPEED = 0.7;
  const PARTICLE_MIN_RADIUS = 1.2;
  const PARTICLE_RADIUS_VARIATION = 1.8;
  const PARTICLE_SHADOW_BLUR = 8;
  const RESIZE_REGEN_DELAY_MS = 120;

  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;
  let particles = [];
  let targetParticleCount = BASE_PARTICLE_COUNT;
  let connectionDistance = DEFAULT_CONNECTION_DISTANCE;
  let particleFillColor = "rgba(57,255,20,0.7)";
  let particleLineColor = "rgba(57,255,20,0.13)";
  let resizeTimeoutId = null;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function resizeCanvas() {
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    canvas.width = viewportWidth;
    canvas.height = viewportHeight;
  }

  function computeDensitySettings() {
    const areaRatio = (viewportWidth * viewportHeight) / REFERENCE_AREA;

    targetParticleCount = Math.max(
      MIN_PARTICLE_COUNT,
      clamp(Math.round(BASE_PARTICLE_COUNT * areaRatio), 0, MAX_PARTICLES),
    );

    connectionDistance = clamp(
      Math.round(DEFAULT_CONNECTION_DISTANCE * Math.sqrt(areaRatio)),
      MIN_CONNECTION_DISTANCE,
      MAX_CONNECTION_DISTANCE,
    );
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

  function updatePalette() {
    const rootStyles = getComputedStyle(document.body);
    const primaryColor = rootStyles.getPropertyValue("--text");
    const [r, g, b] = parseColorToRgb(primaryColor);
    particleFillColor = `rgba(${r},${g},${b},0.7)`;
    particleLineColor = `rgba(${r},${g},${b},0.13)`;
  }

  function createParticle() {
    return {
      x: Math.random() * viewportWidth,
      y: Math.random() * viewportHeight,
      velocityX: (Math.random() - 0.5) * PARTICLE_SPEED,
      velocityY: (Math.random() - 0.5) * PARTICLE_SPEED,
      radius: PARTICLE_MIN_RADIUS + Math.random() * PARTICLE_RADIUS_VARIATION,
    };
  }

  function regenerateParticles() {
    computeDensitySettings();
    particles = Array.from({ length: targetParticleCount }, createParticle);
  }

  function scheduleParticlesRegeneration() {
    if (resizeTimeoutId) {
      clearTimeout(resizeTimeoutId);
    }

    resizeTimeoutId = setTimeout(() => {
      regenerateParticles();
    }, RESIZE_REGEN_DELAY_MS);
  }

  function handleWindowResize() {
    resizeCanvas();
    scheduleParticlesRegeneration();
  }

  function drawConnectionLines() {
    for (let indexA = 0; indexA < particles.length; indexA += 1) {
      for (let indexB = indexA + 1; indexB < particles.length; indexB += 1) {
        const deltaX = particles[indexA].x - particles[indexB].x;
        const deltaY = particles[indexA].y - particles[indexB].y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance >= connectionDistance) {
          continue;
        }

        context.strokeStyle = particleLineColor;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(particles[indexA].x, particles[indexA].y);
        context.lineTo(particles[indexB].x, particles[indexB].y);
        context.stroke();
      }
    }
  }

  function drawParticles() {
    context.fillStyle = particleFillColor;
    context.shadowColor = particleFillColor;
    context.shadowBlur = PARTICLE_SHADOW_BLUR;

    for (const particle of particles) {
      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius, 0, 2 * Math.PI);
      context.fill();
    }
  }

  function drawScene() {
    context.clearRect(0, 0, viewportWidth, viewportHeight);
    drawConnectionLines();
    drawParticles();
  }

  function updateParticlesPosition() {
    for (const particle of particles) {
      particle.x += particle.velocityX;
      particle.y += particle.velocityY;

      if (particle.x < 0 || particle.x > viewportWidth) {
        particle.velocityX *= -1;
      }

      if (particle.y < 0 || particle.y > viewportHeight) {
        particle.velocityY *= -1;
      }
    }
  }

  function animateFrame() {
    updateParticlesPosition();
    drawScene();
    requestAnimationFrame(animateFrame);
  }

  window.addEventListener("portfolio-theme-change", updatePalette);
  window.addEventListener("resize", handleWindowResize);

  updatePalette();
  resizeCanvas();
  regenerateParticles();
  animateFrame();
})();
