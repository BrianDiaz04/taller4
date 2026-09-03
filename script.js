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

let lastTime = performance.now();

let inLobby = true;
let phase = "incertidumbre";

let anxietyMix = 0;
let expectationMix = 0;

let anxietyHoldTime = 0;
let expectationHoldTime = 0;
let expectationStage = "approach"; // approach, flash, final
let expectationFlashStart = null;

const expectationChargeDuration = 5;
const expectationFlashDuration = 7;

const shapes = [];
const planets = [];
const burstRays = [];
let lobbyButtons = [];

// Anomalías raras en las figuras que avanzan durante
// "incertidumbre": los primeros 10s todo se comporta normal.
// Después, cada tanto se tira una moneda cargada (2/5) para
// ver si a un grupo de figuras le pasa algo raro un rato.
let phaseStartTime = 0;
let nextAnomalyCheckAt = 0;

// Anomalía "todas se van al costado": chequeo aparte, más
// difícil de dar. Cada 20s exactos se tira una moneda 50/50,
// pero SOLO cuenta si en ese instante se está manteniendo
// presionado (deslizando). Si no se está presionando en ese
// momento puntual, se pierde esa chance y hay que esperar
// otros 20s.
let nextSidewaysAllCheckAt = 0;

resize();

canvas.addEventListener("mousedown", (e) => {
  if (handleLobbySelection(e.clientX, e.clientY)) return;
  if (inLobby) return;

  // En desktop se mantiene el click sostenido como equivalente
  // del gesto táctil (no hay "deslizar" real con mouse).
  accelerating = true;
});

window.addEventListener("mouseup", () => {
  accelerating = false;
});

//------------------------------------
// Touch: hace falta DESLIZAR hacia arriba para avanzar, no
// alcanza con tocar y quedarse quieto. Se seguí el movimiento
// del dedo entre cada touchmove: si viene subiendo, avanza; si
// se queda quieto o baja, un pequeño timer de inactividad corta
// el impulso enseguida (no hace falta levantar el dedo).
//------------------------------------
let touchLastY = null;
let touchIdleTimer = null;

const swipeUpThreshold = 2; // px mínimos de movimiento hacia arriba para contar
const swipeIdleMs = 160; // sin nuevo movimiento hacia arriba en este lapso, se corta

function clearSwipeIdleTimer() {
  if (touchIdleTimer) {
    clearTimeout(touchIdleTimer);
    touchIdleTimer = null;
  }
}

function armSwipeIdleTimer() {
  clearSwipeIdleTimer();
  touchIdleTimer = setTimeout(() => {
    accelerating = false;
  }, swipeIdleMs);
}

canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();

    const touch = e.touches[0];

    if (handleLobbySelection(touch.clientX, touch.clientY)) return;
    if (inLobby) return;

    touchLastY = touch.clientY;

    // Tocar por sí solo no avanza nada; hace falta deslizar.
    accelerating = false;
    clearSwipeIdleTimer();
  },
  { passive: false }
);

canvas.addEventListener(
  "touchmove",
  (e) => {
    if (inLobby || touchLastY === null) return;

    e.preventDefault();

    const touch = e.touches[0];
    const deltaY = touchLastY - touch.clientY; // positivo = dedo subiendo
    touchLastY = touch.clientY;

    if (deltaY > swipeUpThreshold) {
      accelerating = true;
      armSwipeIdleTimer();
    }
    // Si desliza hacia abajo o casi no se mueve, no reactivamos:
    // el timer de inactividad corta el impulso solo si dejó de
    // venir movimiento hacia arriba.
  },
  { passive: false }
);

window.addEventListener("touchend", () => {
  accelerating = false;
  touchLastY = null;
  clearSwipeIdleTimer();
});

window.addEventListener("touchcancel", () => {
  accelerating = false;
  touchLastY = null;
  clearSwipeIdleTimer();
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
  } else {
    startPhase("incertidumbre");
  }
});

function createLobbyButtons() {
  const w = canvas.width;

  const gap = 10;
  const buttonWidth = Math.min(170, (w - 64) / 3);
  const buttonHeight = 38;
  const totalWidth = buttonWidth * 3 + gap * 2;
  const x = w / 2 - totalWidth / 2;
  const y = 22;

  lobbyButtons = [
    {
      label: "Incertidumbre",
      phase: "incertidumbre",
      x,
      y,
      width: buttonWidth,
      height: buttonHeight
    },
    {
      label: "Ansiedad",
      phase: "ansiedad",
      x: x + buttonWidth + gap,
      y,
      width: buttonWidth,
      height: buttonHeight
    },
    {
      label: "Expectativa",
      phase: "expectativa",
      x: x + (buttonWidth + gap) * 2,
      y,
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
      return true;
    }
  }

  return false;
}

function startPhase(selectedPhase) {
  inLobby = false;
  phase = selectedPhase;
  accelerating = false;

  anxietyMix = 0;
  expectationMix = 0;

  anxietyHoldTime = 0;
  expectationHoldTime = 0;
  expectationStage = "approach";
  expectationFlashStart = null;

  phaseStartTime = performance.now();
  nextAnomalyCheckAt = 0;
  nextSidewaysAllCheckAt = 0;

  speed = 2;

  for (const s of shapes) {
    resetShape(s);
  }
}

function getStage() {
  const margin = isMobile ? 18 : 40;
  const top = isMobile ? 82 : 86;

  return {
    x: margin,
    y: top,
    width: canvas.width - margin * 2,
    height: canvas.height - top - margin
  };
}

function drawOuterBackground() {
  ctx.fillStyle = "#050409";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const glowBackground = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width);
  glowBackground.addColorStop(0, "rgba(80, 18, 28, 0.12)");
  glowBackground.addColorStop(0.5, "rgba(28, 8, 18, 0.18)");
  glowBackground.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = glowBackground;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function clipStage() {
  const stage = getStage();

  ctx.save();
  ctx.beginPath();
  ctx.rect(stage.x, stage.y, stage.width, stage.height);
  ctx.clip();
}

function drawStageFrame() {
  const stage = getStage();

  ctx.save();

  ctx.strokeStyle = "rgba(255, 130, 135, 0.28)";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(stage.x, stage.y, stage.width, stage.height);

  ctx.strokeStyle = "rgba(255, 220, 210, 0.08)";
  ctx.lineWidth = 1;
  ctx.strokeRect(stage.x + 8, stage.y + 8, stage.width - 16, stage.height - 16);

  ctx.restore();
}

function drawPhaseButtons() {
  ctx.save();

  ctx.font = isMobile
    ? "12px Arial, Helvetica, sans-serif"
    : "13px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const button of lobbyButtons) {
    const active = !inLobby && button.phase === phase;

    ctx.fillStyle = active
      ? "rgba(255, 95, 100, 0.24)"
      : "rgba(12, 5, 12, 0.76)";

    ctx.strokeStyle = active
      ? "rgba(255, 210, 205, 0.72)"
      : "rgba(255, 120, 130, 0.34)";

    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect(button.x, button.y, button.width, button.height, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = active
      ? "rgba(255, 235, 230, 0.96)"
      : "rgba(255, 205, 205, 0.72)";

    ctx.fillText(
      button.label,
      button.x + button.width / 2,
      button.y + button.height / 2
    );
  }

  ctx.restore();
}

function resetShape(s) {
  const stage = getStage();

  s.x = (Math.random() - 0.5) * stage.width;
  s.y = (Math.random() - 0.5) * stage.height;
  s.z = Math.random() * 2100 + 350;
  s.type = Math.random() < 0.5 ? "square" : "triangle";
  s.shake = Math.random() * Math.PI * 2;
  s.anomaly = null;
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

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawOuterBackground();

  if (inLobby) {
    clipStage();
    drawLobbyScene(now);
    ctx.restore();

    drawStageFrame();
    if (!isMini) drawPhaseButtons();
    return;
  }

  updatePhase(delta, now);
  updateSpeed();

  clipStage();

  drawBackground();
  drawTunnel(now);
  drawShapes(now);
  drawAnxietyRays(now);
  drawArrivalBurst(now);
  drawSolarSystem(now);
  drawLight(now);
  drawFlash(now);

  ctx.restore();

  drawStageFrame();
  if (!isMini) drawPhaseButtons();
}

//------------------------------------
// Entrada directa por parámetro de URL (?estado=)
//------------------------------------
const urlParams = new URLSearchParams(window.location.search);
const estadoInicial = urlParams.get("estado");

if (["incertidumbre", "ansiedad", "expectativa"].includes(estadoInicial)) {
  startPhase(estadoInicial);
}

//------------------------------------
// Modo miniatura (?mini=1)
// Oculta los botones. A diferencia de los otros dos
// subsistemas, la interacción real de este no es un click
// sino un drag/touch SOSTENIDO hacia arriba (mantener
// presionado para acelerar). Por eso, en vez de simular un
// tap puntual, se simula ese mismo gesto: se mantiene
// "accelerating" en true durante un rato y después se suelta.
// "accelerating" es la misma variable que activa mousedown /
// touchstart, así que el resultado es idéntico al de un dedo
// real sosteniendo el drag.
//
// El ritmo (cada cuánto arranca un drag y cuánto se sostiene)
// se ajusta desde mini-sim-config.js (window.MINI_SIM_CONFIG.drag),
// no acá.
//------------------------------------
const isMini = urlParams.get("mini") === "1";

if (isMini) {
  const dragCfg = (window.MINI_SIM_CONFIG && window.MINI_SIM_CONFIG.drag) || {};
  const dragIntervalMin = dragCfg.intervalMin ?? 5000;
  const dragIntervalMax = dragCfg.intervalMax ?? 6000;
  const dragHoldMin = dragCfg.holdDurationMin ?? 1800;
  const dragHoldMax = dragCfg.holdDurationMax ?? 2600;

  function scheduleMiniDrag() {
    const wait = miniRandomRange(dragIntervalMin, dragIntervalMax);

    setTimeout(() => {
      accelerating = true; // "dedo" apoyado y arrastrando hacia arriba

      const holdDuration = miniRandomRange(dragHoldMin, dragHoldMax);

      setTimeout(() => {
        accelerating = false; // se suelta el drag
        scheduleMiniDrag();
      }, holdDuration);
    }, wait);
  }

  scheduleMiniDrag();
}

function miniRandomRange(min, max) {
  return Math.random() * (max - min) + min;
}

animate();

function updatePhase(delta, now) {
  if (phase === "incertidumbre") {
    anxietyMix += (0 - anxietyMix) * 0.04;
    expectationMix += (0 - expectationMix) * 0.04;

    if (now - phaseStartTime >= 10000 && now >= nextAnomalyCheckAt) {
      nextAnomalyCheckAt = now + 2200 + Math.random() * 2400;

      if (Math.random() < 0.48) {
        triggerShapeAnomaly(now);
      }
    }

    if (now - phaseStartTime >= 10000 && now >= nextSidewaysAllCheckAt) {
      nextSidewaysAllCheckAt = now + 20000;

      if (accelerating && Math.random() < 0.5) {
        triggerSidewaysAllAnomaly(now);
      }
    }

    return;
  }

  if (phase === "ansiedad") {
    expectationMix += (0 - expectationMix) * 0.04;

    if (accelerating) {
      anxietyHoldTime += delta;
    }

    const target = Math.min(1, anxietyHoldTime / 5);
    anxietyMix += (target - anxietyMix) * 0.05;
    return;
  }

  if (phase === "expectativa") {
    anxietyMix += (0 - anxietyMix) * 0.035;

    if (expectationStage === "approach") {
      if (accelerating) {
        expectationHoldTime += delta;
      }

      if (expectationHoldTime >= expectationChargeDuration) {
        expectationStage = "flash";
        expectationFlashStart = now;
      }
    }

    if (expectationStage === "flash") {
      const elapsed = (now - expectationFlashStart) / 1000;

      if (elapsed >= expectationFlashDuration) {
        expectationStage = "final";
      }
    }

    if (expectationStage === "final") {
      expectationMix += (1 - expectationMix) * 0.018;
    }
  }
}

function updateSpeed() {
  let targetSpeed = accelerating ? 13 : 1.8;

  if (phase === "ansiedad") {
    const anxietyTargetSpeed = accelerating ? 5.2 : 1.1;
    targetSpeed = targetSpeed * (1 - anxietyMix) + anxietyTargetSpeed * anxietyMix;
  }

  if (phase === "expectativa") {
    if (expectationStage === "approach") {
      targetSpeed = accelerating ? 15 : 1.8;
    }

    if (expectationStage === "flash") {
      targetSpeed = 0.35;
    }

    if (expectationStage === "final") {
      const finalSpeed = accelerating ? 2.1 : 0.55;
      targetSpeed = targetSpeed * (1 - expectationMix) + finalSpeed * expectationMix;
    }
  }

  speed += (targetSpeed - speed) * 0.045;
}

function drawLobbyScene(now) {
  const stage = getStage();
  const cx = stage.x + stage.width / 2;
  const cy = stage.y + stage.height / 2;

  ctx.fillStyle = "#050505";
  ctx.fillRect(stage.x, stage.y, stage.width, stage.height);

  const backgroundGlow = ctx.createRadialGradient(
    cx,
    cy,
    0,
    cx,
    cy,
    stage.width * 0.7
  );

  backgroundGlow.addColorStop(0, "rgba(80, 18, 28, 0.18)");
  backgroundGlow.addColorStop(0.45, "rgba(30, 7, 18, 0.24)");
  backgroundGlow.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = backgroundGlow;
  ctx.fillRect(stage.x, stage.y, stage.width, stage.height);

  const pulse = Math.sin(now * 0.002) * 0.08 + 0.92;

  const light = ctx.createRadialGradient(cx, cy, 0, cx, cy, 140 * pulse);
  light.addColorStop(0, "rgba(255, 235, 232, 0.58)");
  light.addColorStop(0.18, "rgba(255, 105, 112, 0.22)");
  light.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.arc(cx, cy, 140 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = "rgba(255, 235, 232, 0.7)";
  ctx.arc(cx, cy, 20 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 130, 135, 0.12)";
  ctx.lineWidth = 1;

  for (let i = 0; i < 28; i++) {
    const angle = ((Math.PI * 2) / 28) * i;
    const x = cx + Math.cos(angle) * stage.width;
    const y = cy + Math.sin(angle) * stage.height;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
}

function getFlashProgress(now) {
  if (phase !== "expectativa" || expectationStage !== "flash") return 0;
  if (expectationFlashStart === null) return 0;

  const elapsed = (now - expectationFlashStart) / 1000;
  return Math.min(1, elapsed / expectationFlashDuration);
}

function getFlashPower(now) {
  const progress = getFlashProgress(now);
  if (progress <= 0) return 0;

  const fadeIn = Math.min(1, progress / 0.18);
  const fadeOut = 1 - Math.max(0, (progress - 0.72) / 0.28);
  const pulse = 0.78 + Math.sin(now * 0.018) * 0.22;

  return Math.max(0, Math.min(fadeIn, fadeOut)) * pulse;
}

function drawBackground() {
  const stage = getStage();
  const flashBase = expectationStage === "flash" ? 0.16 : 0;

  const red = Math.floor(4 + 18 * anxietyMix + 8 * expectationMix + 18 * flashBase);
  const blue = Math.floor(4 + 18 * expectationMix + 14 * flashBase);

  ctx.fillStyle = `rgb(${red}, 2, ${blue})`;
  ctx.fillRect(stage.x, stage.y, stage.width, stage.height);

  const cx = stage.x + stage.width / 2;
  const cy = stage.y + stage.height / 2;

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, stage.width);

  gradient.addColorStop(0, `rgba(80, 0, 10, ${0.11 * anxietyMix + 0.16 * flashBase})`);
  gradient.addColorStop(0.45, `rgba(34, 0, 22, ${0.2 * expectationMix + 0.1 * flashBase})`);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(stage.x, stage.y, stage.width, stage.height);
}

function drawTunnel(now) {
  const stage = getStage();
  const cx = stage.x + stage.width / 2;
  const cy = stage.y + stage.height / 2;
  const fade = 1 - expectationMix;

  ctx.strokeStyle = `rgba(170, 24, 34, ${
    (0.14 + 0.12 * anxietyMix) * fade
  })`;
  ctx.lineWidth = 1 + anxietyMix * 0.35;

  const total = 40;
  const reach = Math.max(stage.width, stage.height);

  for (let i = 0; i < total; i++) {
    const angle = ((Math.PI * 2) / total) * i;
    const x = cx + Math.cos(angle) * reach;
    const y = cy + Math.sin(angle) * reach;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
}

function triggerShapeAnomaly(now) {
  const candidates = shapes.filter((s) => !s.anomaly);
  if (candidates.length === 0) return;

  const types = ["grow", "shrink", "reverse", "color"];
  const type = types[Math.floor(Math.random() * types.length)];

  // "reverse" y "color" se notan más si les pasa a varias figuras
  // a la vez (2 a 4), no a una sola. El resto sigue afectando
  // a una única figura por evento.
  const affectsGroup = type === "reverse" || type === "color";
  const count = affectsGroup ? 2 + Math.floor(Math.random() * 3) : 1;

  const pool = candidates.slice();

  for (let i = 0; i < count && pool.length > 0; i++) {
    const index = Math.floor(Math.random() * pool.length);
    const s = pool.splice(index, 1)[0];

    s.anomaly = {
      type,
      start: now,
      duration: 1500 + Math.random() * 1800,
      sideDir: Math.random() < 0.5 ? -1 : 1
    };
  }
}

function triggerSidewaysAllAnomaly(now) {
  for (const s of shapes) {
    s.anomaly = {
      type: "sidewaysAll",
      start: now,
      duration: 1500 + Math.random() * 1800,
      sideDir: Math.random() < 0.5 ? -1 : 1
    };
  }
}

function drawShapes(now) {
  const stage = getStage();
  const cx = stage.x + stage.width / 2;
  const cy = stage.y + stage.height / 2;
  const opacity = 0.86 - expectationMix * 0.58;

  ctx.fillStyle = `rgba(255, ${120 - 42 * anxietyMix}, ${
    120 - 50 * anxietyMix
  }, ${opacity})`;

  ctx.shadowColor = anxietyMix > 0.5 ? "#ff3c3c" : "#ff6666";
  ctx.shadowBlur = speed + 3 * anxietyMix;

  for (const s of shapes) {
    let anomalyStrength = 0;

    if (s.anomaly) {
      const aElapsed = now - s.anomaly.start;

      if (aElapsed > s.anomaly.duration) {
        s.anomaly = null;
      } else {
        const at = aElapsed / s.anomaly.duration;
        const fadeIn = Math.min(1, at / 0.25);
        const fadeOut = 1 - Math.max(0, (at - 0.7) / 0.3);
        anomalyStrength = Math.max(0, Math.min(fadeIn, fadeOut));
      }
    }

    if (phase === "expectativa" && expectationStage === "final") {
      s.z += speed * 4.2;
    } else if (phase === "expectativa" && expectationStage === "flash") {
      s.z += 0.6;
    } else if (s.anomaly && s.anomaly.type === "reverse") {
      // en vez de avanzar, retrocede un rato
      s.z += speed * (1 + anomalyStrength * 1.6);
    } else {
      s.z -= speed;
    }

    if (s.anomaly && (s.anomaly.type === "sideways" || s.anomaly.type === "sidewaysAll")) {
      // deriva lateral, se va a un costado
      s.x += s.anomaly.sideDir * (2.4 + speed * 0.6) * anomalyStrength;
    }

    if (s.z <= 1 || s.z > 3500) {
      resetShape(s);

      if (phase === "expectativa" && expectationStage === "final") {
        s.z = 450 + Math.random() * 1000;
      }

      continue;
    }

    const scale = 500 / s.z;
    let px = cx + s.x * scale;
    let py = cy + s.y * scale;
    let size = Math.max(1, 12 * scale);

    if (s.anomaly && s.anomaly.type === "grow") {
      size *= 1 + anomalyStrength * 2.2;
    } else if (s.anomaly && s.anomaly.type === "shrink") {
      size = Math.max(0.6, size * (1 - anomalyStrength * 0.75));
    }

    const shakePower = anxietyMix * (1 - expectationMix);

    if (shakePower > 0) {
      const shakeAmount = shakePower * Math.min(4.5, 1.2 + size * 0.32);
      px += Math.sin(now * 0.028 + s.shake) * shakeAmount;
      py += Math.cos(now * 0.036 + s.shake) * shakeAmount;
    }

    const isColorAnomaly = s.anomaly && s.anomaly.type === "color" && anomalyStrength > 0;

    if (isColorAnomaly) {
      ctx.save();
      ctx.fillStyle = `rgba(120, 200, 255, ${0.72 * anomalyStrength + 0.18})`;
      ctx.shadowColor = "#78c8ff";
    }

    if (s.type === "square") {
      ctx.fillRect(px - size / 2, py - size / 2, size, size);
    } else {
      drawTriangle(px, py, size / 2);
    }

    if (isColorAnomaly) {
      ctx.restore();
    }
  }

  ctx.shadowBlur = 0;
}

function drawAnxietyRays(now) {
  if (anxietyMix <= 0 || expectationMix > 0.04) return;

  const stage = getStage();
  const cx = stage.x + stage.width / 2;
  const cy = stage.y + stage.height / 2;
  const rays = 16;
  const maxLength = Math.max(stage.width, stage.height) * 0.36;

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
  const flashPower = getFlashPower(now);
  const finalBurst = phase === "expectativa" && expectationStage === "final" && expectationMix < 0.35;

  if (flashPower <= 0 && !finalBurst) return;

  const stage = getStage();
  const cx = stage.x + stage.width / 2;
  const cy = stage.y + stage.height / 2;
  const maxLength = Math.max(stage.width, stage.height) * 0.72;
  const burst = Math.max(flashPower, finalBurst ? 1 - expectationMix * 2.5 : 0);

  ctx.save();
  ctx.translate(cx, cy);

  for (const ray of burstRays) {
    const localBurst = Math.max(0, burst - ray.delay);

    if (localBurst <= 0) continue;

    const start = 26 + (1 - localBurst) * 110;
    const end = maxLength * ray.length;

    ctx.strokeStyle = `rgba(255, ${150 + 70 * localBurst}, ${
      150 + 70 * localBurst
    }, ${0.16 * localBurst})`;

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

  const stage = getStage();
  const cx = stage.x + stage.width / 2;
  const cy = stage.y + stage.height / 2;

  const orbitScale = isMobile ? 0.38 : 0.43;
  const maxOrbit = Math.min(stage.width, stage.height) * orbitScale;
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
  const stage = getStage();
  const cx = stage.x + stage.width / 2;
  const cy = stage.y + stage.height / 2;
  const flashPower = getFlashPower(now);

  glow += 0.03;

  const calmPulse = Math.sin(glow) * 2;
  const anxiousPulse =
    Math.sin(now * 0.016) * 4 + Math.sin(now * 0.041) * 2.5;
  const stablePulse = Math.sin(now * 0.004) * 2.5;

  const distantLight = 1 - anxietyMix;
  const flicker =
    1 +
    anxietyMix * (1 - expectationMix) * (Math.sin(now * 0.035) * 0.035) +
    expectationMix * (Math.sin(now * 0.008) * 0.015) +
    flashPower * (Math.sin(now * 0.03) * 0.08);

  const radius =
    38 * distantLight +
    62 * anxietyMix * (1 - expectationMix) +
    76 * expectationMix +
    42 * flashPower +
    calmPulse * distantLight +
    anxiousPulse * anxietyMix * (1 - expectationMix) +
    stablePulse * expectationMix;

  const auraSize =
    150 * distantLight +
    230 * anxietyMix * (1 - expectationMix) +
    340 * expectationMix +
    260 * flashPower;

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, auraSize * flicker);

  gradient.addColorStop(0, "rgba(255,245,238,0.98)");
  gradient.addColorStop(
    0.16,
    `rgba(255, ${110 + 55 * expectationMix + 45 * flashPower}, ${
      100 + 65 * expectationMix + 45 * flashPower
    }, ${0.72 + 0.14 * anxietyMix + 0.1 * flashPower})`
  );
  gradient.addColorStop(
    0.46,
    `rgba(${145 + 40 * anxietyMix + 60 * flashPower}, ${
      22 + 28 * expectationMix + 35 * flashPower
    }, ${32 + 45 * expectationMix + 35 * flashPower}, ${
      0.22 + 0.12 * anxietyMix + 0.18 * flashPower
    })`
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
  const flashPower = getFlashPower(now);

  if (flashPower <= 0) return;

  const stage = getStage();

  ctx.fillStyle = `rgba(255, 238, 230, ${0.26 * flashPower})`;
  ctx.fillRect(stage.x, stage.y, stage.width, stage.height);
}