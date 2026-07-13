const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  createLobbyButtons();
}
window.addEventListener("resize", resize);

const isMobile = window.innerWidth < 768;

let accelerating = false;
let speed = 2;
let glow = 0;

let interactionTime = 0;
let lastTime = performance.now();

let inLobby = true;
let phase = "incertidumbre";
let anxietyMix = 0;
let expectationMix = 0;
let expectationStart = null;

const shapes = [];
const planets = [];
const burstRays = [];
let lobbyButtons = [];

resize();

canvas.addEventListener("mousedown", (e) => {
  if (inLobby) {
    handleLobbySelection(e.clientX, e.clientY);
    return;
  }

  accelerating = true;
});

window.addEventListener("mouseup", () => {
  accelerating = false;
});

canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();

    const touch = e.touches[0];

    if (inLobby) {
      handleLobbySelection(touch.clientX, touch.clientY);
      return;
    }

    accelerating = true;
  },
  { passive: false }
);

window.addEventListener("touchend", () => {
  accelerating = false;
});

window.addEventListener("touchcancel", () => {
  accelerating = false;
});

window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== "k") return;

  if (inLobby) {
    startPhase("incertidumbre");
    return;
  }

  if (phase === "incertidumbre") {
    startPhase("ansiedad");
  } else if (phase === "ansiedad") {
    startPhase("expectativa");
  }
});

function createLobbyButtons() {
  const w = canvas.width;
  const h = canvas.height;

  const buttonWidth = Math.min(320, w * 0.72);
  const buttonHeight = 56;
  const gap = 18;

  const totalHeight = buttonHeight * 3 + gap * 2;
  const startY = h / 2 - totalHeight / 2 + 40;
  const x = w / 2 - buttonWidth / 2;

  lobbyButtons = [
    {
      label: "Incertidumbre",
      phase: "incertidumbre",
      x,
      y: startY,
      width: buttonWidth,
      height: buttonHeight
    },
    {
      label: "Ansiedad",
      phase: "ansiedad",
      x,
      y: startY + buttonHeight + gap,
      width: buttonWidth,
      height: buttonHeight
    },
    {
      label: "Expectativa",
      phase: "expectativa",
      x,
      y: startY + (buttonHeight + gap) * 2,
      width: buttonWidth,
      height: buttonHeight
    }
  ];
}

function handleLobbySelection(x, y) {
  for (const button of lobbyButtons) {
    const insideX = x >= button.x && x <= button.x + button.width;
    const insideY = y >= button.y && y <= button.y + button.height;

    if (insideX && insideY) {
      startPhase(button.phase);
      return;
    }
  }
}

function startPhase(selectedPhase) {
  inLobby = false;
  phase = selectedPhase;
  accelerating = false;

  if (selectedPhase === "incertidumbre") {
    interactionTime = 0;
    anxietyMix = 0;
    expectationMix = 0;
    expectationStart = null;
    speed = 2;
  }

  if (selectedPhase === "ansiedad") {
    interactionTime = 15;
    anxietyMix = 1;
    expectationMix = 0;
    expectationStart = null;
    speed = 1.1;
  }

  if (selectedPhase === "expectativa") {
    interactionTime = 30;
    anxietyMix = 1;
    expectationMix = 0;
    expectationStart = performance.now();
    speed = 0.55;
  }
}

function resetShape(s) {
  s.x = (Math.random() - 0.5) * canvas.width;
  s.y = (Math.random() - 0.5) * canvas.height;
  s.z = Math.random() * 2100 + 350;
  s.type = Math.random() < 0.5 ? "square" : "triangle";
  s.shake = Math.random() * Math.PI * 2;
}

const shapeCount = isMobile ? 90 : 150;

for (let i = 0; i < shapeCount; i++) {
  const s = {};
  resetShape(s);
  shapes.push(s);
}

const planetCount = isMobile ? 38 : 56;

for (let i = 0; i < planetCount; i++) {
  planets.push({
    orbit: 80 + Math.random() * 360,
    angle: Math.random() * Math.PI * 2,
    speed: 0.00018 + Math.random() * 0.00042,
    size: 3 + Math.random() * 8,
    type:
      Math.random() < 0.45
        ? "circle"
        : Math.random() < 0.72
        ? "square"
        : "triangle",
    alpha: 0.42 + Math.random() * 0.5
  });
}

for (let i = 0; i < 90; i++) {
  burstRays.push({
    angle: Math.random() * Math.PI * 2,
    length: 0.35 + Math.random() * 0.65,
    width: 0.5 + Math.random() * 1.2,
    delay: Math.random() * 0.22
  });
}

function drawTriangle(x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x - size, y + size);
  ctx.lineTo(x + size, y + size);
  ctx.closePath();
  ctx.fill();
}

function animate(now = performance.now()) {
  requestAnimationFrame(animate);

  const delta = (now - lastTime) / 1000;
  lastTime = now;

  if (inLobby) {
    drawLobby(now);
    return;
  }

  if (accelerating && phase !== "expectativa") {
    interactionTime += delta;
  }

  if (interactionTime >= 30) {
    if (phase !== "expectativa") {
      expectationStart = now;
    }

    phase = "expectativa";
  } else if (interactionTime >= 15) {
    phase = "ansiedad";
  }

  if (phase === "ansiedad") {
    anxietyMix += (1 - anxietyMix) * 0.022;
  }

  if (phase === "expectativa") {
    anxietyMix += (1 - anxietyMix) * 0.018;
    expectationMix += (1 - expectationMix) * 0.014;
  }

  const normalTargetSpeed = accelerating ? 13 : 1.8;
  const anxietyTargetSpeed = accelerating ? 5.2 : 1.1;
  const expectationTargetSpeed = accelerating ? 2.1 : 0.55;

  const anxiousSpeed =
    normalTargetSpeed * (1 - anxietyMix) + anxietyTargetSpeed * anxietyMix;

  const targetSpeed =
    anxiousSpeed * (1 - expectationMix) +
    expectationTargetSpeed * expectationMix;

  speed += (targetSpeed - speed) * 0.045;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackground();
  drawTunnel(now);
  drawShapes(now);
  drawAnxietyRays(now);
  drawArrivalBurst(now);
  drawSolarSystem(now);
  drawLight(now);
  drawFlash(now);
}

animate();

function drawLobby(now) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const backgroundGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width);

  backgroundGlow.addColorStop(0, "rgba(80, 18, 28, 0.16)");
  backgroundGlow.addColorStop(0.45, "rgba(30, 7, 18, 0.24)");
  backgroundGlow.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = backgroundGlow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const pulse = Math.sin(now * 0.002) * 0.08 + 0.92;

  const light = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150 * pulse);
  light.addColorStop(0, "rgba(255, 235, 232, 0.7)");
  light.addColorStop(0.18, "rgba(255, 105, 112, 0.28)");
  light.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.arc(cx, cy, 150 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = "rgba(255, 235, 232, 0.76)";
  ctx.arc(cx, cy, 24 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = "16px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const button of lobbyButtons) {
    ctx.fillStyle = "rgba(12, 5, 12, 0.72)";
    ctx.strokeStyle = "rgba(255, 120, 130, 0.45)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect(button.x, button.y, button.width, button.height, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 205, 205, 0.88)";
    ctx.fillText(
      button.label,
      button.x + button.width / 2,
      button.y + button.height / 2
    );
  }
}

function drawBackground() {
  const red = Math.floor(4 + 18 * anxietyMix + 8 * expectationMix);
  const blue = Math.floor(4 + 18 * expectationMix);

  ctx.fillStyle = `rgb(${red}, 2, ${blue})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width);

  gradient.addColorStop(0, `rgba(80, 0, 10, ${0.11 * anxietyMix})`);
  gradient.addColorStop(0.45, `rgba(34, 0, 22, ${0.2 * expectationMix})`);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawTunnel(now) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const fade = 1 - expectationMix;

  ctx.strokeStyle = `rgba(170, 24, 34, ${
    (0.14 + 0.12 * anxietyMix) * fade
  })`;
  ctx.lineWidth = 1 + anxietyMix * 0.35;

  const total = 40;

  for (let i = 0; i < total; i++) {
    const angle = ((Math.PI * 2) / total) * i;
    const x = cx + Math.cos(angle) * canvas.width;
    const y = cy + Math.sin(angle) * canvas.height;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
}

function drawShapes(now) {
  const opacity = 0.86 - expectationMix * 0.58;

  ctx.fillStyle = `rgba(255, ${120 - 42 * anxietyMix}, ${
    120 - 50 * anxietyMix
  }, ${opacity})`;

  ctx.shadowColor = anxietyMix > 0.5 ? "#ff3c3c" : "#ff6666";
  ctx.shadowBlur = speed + 3 * anxietyMix;

  for (const s of shapes) {
    if (phase === "expectativa") {
      s.z += speed * 4.2;
    } else {
      s.z -= speed;
    }

    if (s.z <= 1 || s.z > 3500) {
      resetShape(s);

      if (phase === "expectativa") {
        s.z = 450 + Math.random() * 1000;
      }

      continue;
    }

    const scale = 500 / s.z;
    let px = canvas.width / 2 + s.x * scale;
    let py = canvas.height / 2 + s.y * scale;
    const size = Math.max(1, 12 * scale);

    const shakePower = anxietyMix * (1 - expectationMix);

    if (shakePower > 0) {
      const shakeAmount = shakePower * Math.min(4.5, 1.2 + size * 0.32);
      px += Math.sin(now * 0.028 + s.shake) * shakeAmount;
      py += Math.cos(now * 0.036 + s.shake) * shakeAmount;
    }

    if (s.type === "square") {
      ctx.fillRect(px - size / 2, py - size / 2, size, size);
    } else {
      drawTriangle(px, py, size / 2);
    }
  }

  ctx.shadowBlur = 0;
}

function drawAnxietyRays(now) {
  if (anxietyMix <= 0 || expectationMix > 0.04) return;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const rays = 16;
  const maxLength = Math.max(canvas.width, canvas.height) * 0.36;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(now * 0.0007) * 0.11);

  ctx.strokeStyle = `rgba(255, 75, 75, ${0.055 * anxietyMix})`;
  ctx.lineWidth = 1;

  for (let i = 0; i < rays; i++) {
    const angle = ((Math.PI * 2) / rays) * i;
    const pulse = 0.75 + Math.sin(now * 0.0017 + i) * 0.25;
    const length = maxLength * pulse;

    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 70, Math.sin(angle) * 70);
    ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
    ctx.stroke();
  }

  ctx.restore();
}

function drawArrivalBurst(now) {
  if (expectationStart === null) return;

  const elapsed = (now - expectationStart) / 1000;
  const burst = Math.max(0, 1 - elapsed / 1.5);

  if (burst <= 0) return;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const maxLength = Math.max(canvas.width, canvas.height) * 0.72;

  ctx.save();
  ctx.translate(cx, cy);

  for (const ray of burstRays) {
    const localBurst = Math.max(0, burst - ray.delay);

    if (localBurst <= 0) continue;

    const start = 30 + (1 - localBurst) * 120;
    const end = maxLength * ray.length;

    ctx.strokeStyle = `rgba(255, ${150 + 70 * localBurst}, ${
      150 + 70 * localBurst
    }, ${0.18 * localBurst})`;

    ctx.lineWidth = ray.width * localBurst;

    ctx.beginPath();
    ctx.moveTo(Math.cos(ray.angle) * start, Math.sin(ray.angle) * start);
    ctx.lineTo(Math.cos(ray.angle) * end, Math.sin(ray.angle) * end);
    ctx.stroke();
  }

  ctx.restore();
}

function drawSolarSystem(now) {
  if (expectationMix <= 0) return;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const orbitScale = isMobile ? 0.38 : 0.43;
  const maxOrbit = Math.min(canvas.width, canvas.height) * orbitScale;
  const reveal = Math.max(0, (expectationMix - 0.08) / 0.92);

  const zoomOut = 3.2 - reveal * 2.2;
  const systemAlpha = Math.min(1, reveal * 1.35);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(zoomOut, zoomOut);

  ctx.strokeStyle = `rgba(255, 180, 172, ${0.2 * systemAlpha})`;
  ctx.lineWidth = 1 / zoomOut;

  for (let r = 82; r < maxOrbit; r += 42) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = `rgba(255, 105, 120, ${0.09 * systemAlpha})`;

  for (let i = 0; i < 14; i++) {
    const angle = ((Math.PI * 2) / 14) * i;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 58, Math.sin(angle) * 58);
    ctx.lineTo(Math.cos(angle) * maxOrbit, Math.sin(angle) * maxOrbit);
    ctx.stroke();
  }

  for (const p of planets) {
    const orbit = Math.min(p.orbit, maxOrbit);
    const angle = p.angle + now * p.speed;
    const x = Math.cos(angle) * orbit;
    const y = Math.sin(angle) * orbit;
    const size = p.size;

    ctx.fillStyle = `rgba(255, 88, 104, ${p.alpha * systemAlpha})`;
    ctx.strokeStyle = `rgba(255, 210, 198, ${0.72 * systemAlpha})`;
    ctx.shadowColor = "#ffaaa0";
    ctx.shadowBlur = 6 * systemAlpha;

    if (p.type === "circle") {
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === "square") {
      ctx.fillRect(x - size, y - size, size * 2, size * 2);
    } else {
      drawTriangle(x, y, size);
    }

    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

function drawLight(now) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  glow += 0.03;

  const calmPulse = Math.sin(glow) * 2;
  const anxiousPulse =
    Math.sin(now * 0.016) * 4 + Math.sin(now * 0.041) * 2.5;
  const stablePulse = Math.sin(now * 0.004) * 2.5;

  const distantLight = 1 - anxietyMix;
  const flicker =
    1 +
    anxietyMix * (1 - expectationMix) * (Math.sin(now * 0.035) * 0.035) +
    expectationMix * (Math.sin(now * 0.008) * 0.015);

  const radius =
    38 * distantLight +
    62 * anxietyMix * (1 - expectationMix) +
    76 * expectationMix +
    calmPulse * distantLight +
    anxiousPulse * anxietyMix * (1 - expectationMix) +
    stablePulse * expectationMix;

  const auraSize =
    150 * distantLight +
    230 * anxietyMix * (1 - expectationMix) +
    340 * expectationMix;

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, auraSize * flicker);

  gradient.addColorStop(0, "rgba(255,245,238,0.98)");
  gradient.addColorStop(
    0.16,
    `rgba(255, ${110 + 55 * expectationMix}, ${
      100 + 65 * expectationMix
    }, ${0.72 + 0.14 * anxietyMix})`
  );
  gradient.addColorStop(
    0.46,
    `rgba(${145 + 40 * anxietyMix}, ${22 + 28 * expectationMix}, ${
      32 + 45 * expectationMix
    }, ${0.22 + 0.12 * anxietyMix})`
  );
  gradient.addColorStop(1, "rgba(0,0,0,0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, auraSize * flicker, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = `rgba(255, ${232 - 30 * anxietyMix + 38 * expectationMix}, ${
    232 - 36 * anxietyMix + 45 * expectationMix
  }, 0.96)`;
  ctx.arc(cx, cy, Math.max(24, radius), 0, Math.PI * 2);
  ctx.fill();
}

function drawFlash(now) {
  if (expectationStart === null) return;

  const elapsed = (now - expectationStart) / 1000;
  const flash = Math.max(0, 1 - elapsed / 0.9);

  if (flash <= 0) return;

  ctx.fillStyle = `rgba(255, 238, 230, ${0.22 * flash})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}