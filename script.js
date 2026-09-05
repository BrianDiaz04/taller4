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

// Expectativa: en vez de una carga simple por tiempo sostenido, se
// mide un "progreso" (0 a 1) que sube mientras se raya la pantalla y
// baja si se suelta. Cerca del final cuesta más avanzar (efecto imán),
// pero al soltar vuelve a su posición natural a la misma velocidad
// base (sin el freno del imán). Si se retoma antes de llegar a 0, no
// se pierde el progreso, pero se suman 2 segundos más al tiempo total
// necesario, como penalización por haber pausado.
let expectationProgress = 0;
let expectationRequiredSeconds = 12;
let expectationRecoveryPending = false;
let expectationExploded = false;
let expectationExplosionTime = null;
const expectationBurstDuration = 1.4; // segundos que dura la ráfaga de la explosión

// Ansiedad: parpadeo ocasional de oscurecimiento, breve y poco
// frecuente, tipo "susto" de juegos de terror.
let darkFlicker = null;
let nextDarkFlickerCheckAt = 0;

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

let mouseDown = false;
let mouseLastX = null;
let mouseLastY = null;

canvas.addEventListener("mousedown", (e) => {
  if (handleLobbySelection(e.clientX, e.clientY)) return;
  if (inLobby) return;

  mouseDown = true;
  mouseLastX = e.clientX;
  mouseLastY = e.clientY;

  if (phase === "expectativa") {
    // En expectativa hay que "rayar": no alcanza con mantener
    // apretado, hace falta mover el mouse de verdad.
    accelerating = false;
  } else {
    // En incertidumbre/ansiedad, el click sostenido en desktop
    // reemplaza al gesto de deslizar/mantener con el dedo.
    accelerating = true;
  }
});

window.addEventListener("mousemove", (e) => {
  if (!mouseDown || phase !== "expectativa") return;

  const deltaX = e.clientX - mouseLastX;
  const deltaY = mouseLastY - e.clientY;
  mouseLastX = e.clientX;
  mouseLastY = e.clientY;

  handleScratchGesture(deltaX, deltaY);
});

window.addEventListener("mouseup", () => {
  mouseDown = false;
  accelerating = false;
  clearScratchIdleTimer();
});

//------------------------------------
// Touch: en incertidumbre/ansiedad hace falta DESLIZAR (arriba o
// abajo según la fase) para arrancar, no alcanza con tocar y
// quedarse quieto. Pero una vez arrancado, se sigue "sosteniendo"
// mientras el dedo siga tocando la pantalla, aunque se quede
// quieto (antes se cortaba solo con un timer de inactividad; eso
// era el bug reportado). Solo se corta al soltar o al deslizar
// claramente para el otro lado.
// En expectativa es distinto: hace falta movimiento CONTINUO
// (cualquier dirección, tipo "rayar"), y ahí sí corta un timer de
// inactividad si el movimiento se detiene.
//------------------------------------
let touchLastY = null;
let touchLastX = null;
let scratchIdleTimer = null;

const swipeThreshold = 2; // px mínimos de movimiento (arriba o abajo) para contar
const scratchThreshold = 2; // px mínimos de movimiento en cualquier dirección para contar como "rayado"
const scratchIdleMs = 220; // sin movimiento nuevo en este lapso, se corta el rayado

function clearScratchIdleTimer() {
  if (scratchIdleTimer) {
    clearTimeout(scratchIdleTimer);
    scratchIdleTimer = null;
  }
}

function armScratchIdleTimer() {
  clearScratchIdleTimer();
  scratchIdleTimer = setTimeout(() => {
    accelerating = false;
  }, scratchIdleMs);
}

// Incertidumbre (deslizar hacia arriba) y ansiedad (deslizar hacia
// abajo, tratando de escapar) comparten la misma lógica de gesto:
// una vez detectado el deslizamiento en la dirección correcta, se
// sigue "sosteniendo" mientras el dedo siga tocando la pantalla,
// aunque se quede quieto un rato (antes esto se cortaba solo, que
// era el bug). Solo se corta si se levanta el dedo o si el
// deslizamiento cambia claramente a la dirección contraria.
function handleSwipeGesture(deltaY, wantsUp) {
  const movingUp = deltaY > swipeThreshold;
  const movingDown = deltaY < -swipeThreshold;

  if (wantsUp) {
    if (movingUp) accelerating = true;
    else if (movingDown) accelerating = false;
  } else {
    if (movingDown) accelerating = true;
    else if (movingUp) accelerating = false;
  }
  // Si el dedo está quieto (ni sube ni baja lo suficiente), no
  // tocamos "accelerating": queda como estaba mientras siga
  // tocando la pantalla.
}

// Expectativa ("rayar" la pantalla): acá importa el movimiento
// continuo en cualquier dirección, no una dirección específica. Si
// deja de moverse un rato (scratchIdleMs), se corta, aunque el dedo
// siga apoyado en la pantalla.
function handleScratchGesture(deltaX, deltaY) {
  const moved =
    Math.abs(deltaX) > scratchThreshold || Math.abs(deltaY) > scratchThreshold;

  if (moved) {
    accelerating = true;
    armScratchIdleTimer();
  }
}

canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();

    const touch = e.touches[0];

    if (handleLobbySelection(touch.clientX, touch.clientY)) return;
    if (inLobby) return;

    touchLastY = touch.clientY;
    touchLastX = touch.clientX;

    // Tocar por sí solo no avanza nada; hace falta deslizar/rayar.
    accelerating = false;
    clearScratchIdleTimer();
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
    const deltaX = touch.clientX - touchLastX;
    touchLastY = touch.clientY;
    touchLastX = touch.clientX;

    if (phase === "incertidumbre") {
      handleSwipeGesture(deltaY, true);
    } else if (phase === "ansiedad") {
      handleSwipeGesture(deltaY, false);
    } else if (phase === "expectativa") {
      handleScratchGesture(deltaX, deltaY);
    }
  },
  { passive: false }
);

window.addEventListener("touchend", () => {
  accelerating = false;
  touchLastY = null;
  touchLastX = null;
  clearScratchIdleTimer();
});

window.addEventListener("touchcancel", () => {
  accelerating = false;
  touchLastY = null;
  touchLastX = null;
  clearScratchIdleTimer();
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
  mouseDown = false;
  touchLastY = null;
  touchLastX = null;
  clearScratchIdleTimer();

  anxietyMix = 0;
  expectationMix = 0;

  anxietyHoldTime = 0;

  expectationProgress = 0;
  expectationRequiredSeconds = 12;
  expectationRecoveryPending = false;
  expectationExploded = false;
  expectationExplosionTime = null;

  darkFlicker = null;
  nextDarkFlickerCheckAt = 0;

  phaseStartTime = performance.now();
  nextAnomalyCheckAt = 0;
  nextSidewaysAllCheckAt = 0;

  speed = 2;

  for (const s of shapes) {
    resetShape(s);
  }

  for (const p of planets) {
    resetPlanet(p);
  }
}

function getStage() {
  const margin = isMobile ? 18 : 40;
  const top = isMobile ? 82 : 86;

  // En mobile el ancho es mucho menor que el alto, así que si la
  // ventana ocupa todo el espacio disponible queda un rectángulo
  // muy alargado verticalmente y se ve raro. La hacemos cuadrada,
  // usando el lado más chico entre ancho y alto, y la centramos en
  // el espacio disponible. En escritorio no se toca nada.
  if (isMobile) {
    const availWidth = canvas.width - margin * 2;
    const availHeight = canvas.height - top - margin;
    const side = Math.min(availWidth, availHeight);

    return {
      x: margin + (availWidth - side) / 2,
      y: top + (availHeight - side) / 2,
      width: side,
      height: side
    };
  }

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

// Antes de la explosión: posición dispersa "flotando" en x/y (no en
// línea recta hacia el centro). Se reasigna cada vez que se entra a
// la fase, igual que resetShape con las figuras.
function resetPlanet(p) {
  p.floatBaseXRatio = (Math.random() - 0.5) * 0.82;
  p.floatBaseYRatio = (Math.random() - 0.5) * 0.82;
  p.floatPhaseX = Math.random() * Math.PI * 2;
  p.floatPhaseY = Math.random() * Math.PI * 2;
  p.spinPhase = Math.random() * Math.PI * 2;
}

for (let i = 0; i < planetCount; i++) {
  const p = {
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
    alpha: 0.42 + Math.random() * 0.5,
    // Ritmo de la flotación pre-explosión: pausado, similar al
    // reposo (speed ~1.8) de incertidumbre/ansiedad cuando no se
    // está interactuando.
    floatFreqX: 0.00022 + Math.random() * 0.00026,
    floatFreqY: 0.00022 + Math.random() * 0.00026,
    floatAmpX: 16 + Math.random() * 26,
    floatAmpY: 16 + Math.random() * 26,
    // Giro sobre su propio eje una vez que está en órbita (final).
    spinSpeed: (Math.random() < 0.5 ? -1 : 1) * (0.0005 + Math.random() * 0.001)
  };

  resetPlanet(p);
  planets.push(p);
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

// Como drawTriangle/fillRect pero rotando la figura sobre su propio
// eje (para las figuras del sistema solar en el estado final).
function drawSpinningShape(x, y, size, type, spinAngle) {
  if (type === "circle") {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spinAngle);

  if (type === "square") {
    ctx.fillRect(-size, -size, size * 2, size * 2);
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(-size, size);
    ctx.lineTo(size, size);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
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
  updateSpeed(now);
  maybeTriggerDarkFlicker(now);

  clipStage();

  drawBackground(now);

  // Las líneas de fondo (túnel) son propias de incertidumbre nada
  // más: en ansiedad y expectativa se sacan, para que no se vea
  // igual en las 3 fases.
  if (phase === "incertidumbre") drawTunnel(now);

  // Las figuras que avanzan hacia la cámara son de incertidumbre y
  // ansiedad. En expectativa no van: ahí el protagonismo es del
  // sistema de figuras que se acercan al centro (drawSolarSystem).
  if (phase !== "expectativa") drawShapes(now);
  drawArrivalBurst(now);
  // Antes de la explosión: sistema flotando disperso. Después: en
  // órbita, con parte pasando detrás de la luz central y parte
  // adelante (por eso se llama en dos pasos, separados por drawLight).
  drawSolarSystemFloating(now);
  drawSolarSystemBack(now);
  if (phase !== "ansiedad") drawLight(now);
  drawSolarSystemFront(now);
  drawFlash(now);
  drawDarkFlicker(now);

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
    } else {
      // Al soltar, la ansiedad acumulada baja sola y se vuelve a
      // un estado de calma (un poco más rápido de lo que tarda en
      // subir, como un alivio al soltar).
      anxietyHoldTime -= delta * 1.6;
      if (anxietyHoldTime < 0) anxietyHoldTime = 0;
    }

    const target = Math.min(1, anxietyHoldTime / 5);
    anxietyMix += (target - anxietyMix) * 0.05;
    return;
  }

  if (phase === "expectativa") {
    anxietyMix += (0 - anxietyMix) * 0.035;

    if (!expectationExploded) {
      if (accelerating) {
        // Si venía de una pausa con progreso todavía sin volver del
        // todo a 0, retomar tiene un costo: se suman 2 segundos más
        // al tiempo total necesario (no se pierde el progreso, pero
        // cuesta un poco más llegar).
        if (expectationRecoveryPending) {
          expectationRequiredSeconds += 2;
          expectationRecoveryPending = false;
        }

        // Efecto imán: cerca del centro (progreso alto) cuesta cada
        // vez más avanzar.
        const magnetFactor = 1 - expectationProgress * 0.65;
        expectationProgress += (delta / expectationRequiredSeconds) * magnetFactor;

        if (expectationProgress >= 1) {
          expectationProgress = 1;
          expectationExploded = true;
          expectationExplosionTime = now;
        }
      } else if (expectationProgress > 0) {
        expectationRecoveryPending = true;

        // Vuelve a su posición natural a la misma velocidad base
        // con la que se venía acercando (sin el freno del imán).
        expectationProgress -= delta / expectationRequiredSeconds;

        if (expectationProgress < 0) {
          expectationProgress = 0;
          expectationRecoveryPending = false;
        }
      }
    } else {
      // Ya explotó: mezcla de calma ambiente post-explosión.
      expectationMix += (1 - expectationMix) * 0.018;
    }
  }
}

function updateSpeed(now) {
  let targetSpeed = accelerating ? 13 : 1.8;

  if (phase === "ansiedad") {
    const anxietyTargetSpeed = accelerating ? 5.2 : 1.1;
    targetSpeed = targetSpeed * (1 - anxietyMix) + anxietyTargetSpeed * anxietyMix;
  }

  if (phase === "expectativa" && expectationExploded) {
    const elapsedSinceExplosion = (now - expectationExplosionTime) / 1000;

    if (elapsedSinceExplosion < expectationBurstDuration) {
      // Ráfaga de la explosión: todo se dispara hacia la cámara.
      targetSpeed = 16;
    } else {
      // Calma ambiente post-explosión.
      const calmSpeed = accelerating ? 2.4 : 0.6;
      targetSpeed = targetSpeed * (1 - expectationMix) + calmSpeed * expectationMix;
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

// Reemplaza al viejo sistema de "flash" con tiempos fijos: ahora la
// ráfaga solo pasa una vez, justo cuando explota (al llegar el
// progreso a 1), y dura expectationBurstDuration segundos.
function isExpectationBursting(now) {
  if (phase !== "expectativa" || !expectationExploded || expectationExplosionTime === null) {
    return false;
  }

  return (now - expectationExplosionTime) / 1000 < expectationBurstDuration;
}

function getExplosionBurstPower(now) {
  if (!isExpectationBursting(now)) return 0;

  const elapsed = (now - expectationExplosionTime) / 1000;
  const progress = Math.min(1, elapsed / expectationBurstDuration);

  const fadeIn = Math.min(1, progress / 0.15);
  const fadeOut = 1 - Math.max(0, (progress - 0.55) / 0.45);
  const pulse = 0.8 + Math.sin(now * 0.02) * 0.2;

  return Math.max(0, Math.min(fadeIn, fadeOut)) * pulse;
}

function drawBackground(now) {
  const stage = getStage();
  const flashBase = getExplosionBurstPower(now) > 0 ? 0.16 : 0;

  // En reposo (sin ansiedad/expectativa/flash) no pintamos nada acá:
  // el fondo ya quedó dibujado por drawOuterBackground() (incluido su
  // degradado), así que la ventana se ve exactamente igual que el
  // resto de la pantalla. Solo cuando hay un evento que cambia el
  // tono aparece esta capa, con opacidad y color proporcionales a
  // qué tan fuerte es ese evento.
  const tintStrength = Math.min(
    1,
    0.55 * anxietyMix + 0.5 * expectationMix + 0.85 * flashBase
  );

  if (tintStrength > 0.001) {
    const red = Math.floor(5 + 18 * anxietyMix + 8 * expectationMix + 18 * flashBase);
    const green = 4;
    const blue = Math.floor(9 + 18 * expectationMix + 14 * flashBase);

    ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${tintStrength})`;
    ctx.fillRect(stage.x, stage.y, stage.width, stage.height);
  }

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
  const isAnxiety = phase === "ansiedad";

  // Fuera de ansiedad, un solo color parejo para todas (como antes).
  // En ansiedad el color se calcula figura por figura más abajo,
  // según qué tan cerca está cada una.
  if (!isAnxiety) {
    ctx.fillStyle = `rgba(255, ${120 - 42 * anxietyMix}, ${
      120 - 50 * anxietyMix
    }, ${opacity})`;
  }

  ctx.shadowColor = anxietyMix > 0.5 ? "#ff3c3c" : "#ff6666";
  // El desenfoque de ansiedad se logra con más shadowBlur (barato)
  // en vez de ctx.filter (blur real), que con ~150 figuras por
  // frame generaba lag notorio.
  ctx.shadowBlur = speed + 3 * anxietyMix + (isAnxiety ? anxietyMix * 6 : 0);

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

    if (isExpectationBursting(now)) {
      s.z += speed * 4.2;
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
      // En ansiedad nunca se frenan antes de llegar: apenas te
      // "alcanzan" (o se pasan de largo) se resetean atrás y
      // arrancan de nuevo, dando la sensación de que siempre viene
      // otra encima sin pausa.
      resetShape(s);

      if (isExpectationBursting(now)) {
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
      let shakeAmount = shakePower * Math.min(4.5, 1.2 + size * 0.32);

      if (isAnxiety) {
        // En ansiedad tiemblan más en general, y todavía más fuerte
        // en el instante justo del parpadeo negro (como un sobresalto).
        shakeAmount *= darkFlicker ? 2.4 : 1.5;
      }

      px += Math.sin(now * 0.028 + s.shake) * shakeAmount;
      py += Math.cos(now * 0.036 + s.shake) * shakeAmount;
    }

    const isColorAnomaly = s.anomaly && s.anomaly.type === "color" && anomalyStrength > 0;

    if (isColorAnomaly) {
      ctx.save();
      ctx.fillStyle = `rgba(120, 200, 255, ${0.72 * anomalyStrength + 0.18})`;
      ctx.shadowColor = "#78c8ff";
    } else if (isAnxiety) {
      // Empiezan blancas (lejos, z alto) y se van poniendo rojas a
      // medida que se acercan (z bajo).
      const proximity = Math.max(0, Math.min(1, 1 - (s.z - 1) / 2449));
      const g = Math.round(255 - proximity * 195);
      const b = Math.round(255 - proximity * 205);

      ctx.fillStyle = `rgba(255, ${g}, ${b}, ${opacity})`;
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
  const burst = getExplosionBurstPower(now);

  if (burst <= 0) return;

  const stage = getStage();
  const cx = stage.x + stage.width / 2;
  const cy = stage.y + stage.height / 2;
  const maxLength = Math.max(stage.width, stage.height) * 0.72;

  ctx.save();
  ctx.translate(cx, cy);

  for (const ray of burstRays) {
    const localBurst = Math.max(0, burst - ray.delay);

    if (localBurst <= 0) continue;

    const start = 26 + (1 - localBurst) * 110;
    const end = maxLength * ray.length;

    // Rojizo (misma familia que el resto de las fases) en vez del
    // tono blanco/rosado que tenía antes.
    ctx.strokeStyle = `rgba(255, ${70 + 55 * localBurst}, ${
      55 + 45 * localBurst
    }, ${0.2 * localBurst})`;

    ctx.lineWidth = ray.width * localBurst;

    ctx.beginPath();
    ctx.moveTo(Math.cos(ray.angle) * start, Math.sin(ray.angle) * start);
    ctx.lineTo(Math.cos(ray.angle) * end, Math.sin(ray.angle) * end);
    ctx.stroke();
  }

  ctx.restore();
}

// Estado inicial (cargando, sin explotar): figuras dispersas por el
// escenario, flotando en x e y a ritmo pausado — ni quietas del
// todo, ni yendo en línea recta hacia el centro.
// Estado inicial (cargando, sin explotar): vuelve a la disposición
// radial de antes (cada figura en su ángulo fijo, acercándose al
// centro según expectationProgress con el efecto imán), pero ya no
// están del todo quietas: se les suma un pequeño vaivén en su propio
// eje para darles algo de vida.
function drawSolarSystemFloating(now) {
  if (phase !== "expectativa" || expectationExploded) return;

  const stage = getStage();
  const cx = stage.x + stage.width / 2;
  const cy = stage.y + stage.height / 2;
  const maxOrbit = getOrbitMaxRadius(stage);
  const minOrbit = maxOrbit * 0.22; // qué tan cerca del centro llegan (nunca lo tocan del todo)

  const eased = 1 - Math.pow(1 - expectationProgress, 2);

  ctx.save();
  ctx.translate(cx, cy);

  ctx.shadowColor = "#ff6a60";
  ctx.shadowBlur = 5;

  for (const p of planets) {
    const orbit = Math.min(p.orbit, maxOrbit) * (1 - eased) + minOrbit * eased;
    const baseX = Math.cos(p.angle) * orbit;
    const baseY = Math.sin(p.angle) * orbit;

    // Vaivén chico alrededor de esa posición fija, no un flotado
    // amplio: solo un poquito de movimiento.
    const x = baseX + Math.sin(now * p.floatFreqX + p.floatPhaseX) * p.floatAmpX * 0.32;
    const y = baseY + Math.cos(now * p.floatFreqY + p.floatPhaseY) * p.floatAmpY * 0.32;

    ctx.fillStyle = `rgba(255, 120, 122, ${p.alpha})`;

    if (p.type === "circle") {
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === "square") {
      ctx.fillRect(x - p.size, y - p.size, p.size * 2, p.size * 2);
    } else {
      drawTriangle(x, y, p.size);
    }
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

function getOrbitMaxRadius(stage) {
  const orbitScale = isMobile ? 0.38 : 0.43;
  return Math.min(stage.width, stage.height) * orbitScale;
}

// Ángulo, posición (elíptica, para simular profundidad) y giro
// propio de una figura en el estado final, en órbita alrededor del
// centro.
function getOrbitPlanetState(p, maxOrbit, now) {
  const orbitAngle = p.angle + p.speed * now;
  const orbitRadius = Math.min(p.orbit, maxOrbit);
  const tilt = 0.42; // achatamiento de la elipse

  return {
    x: Math.cos(orbitAngle) * orbitRadius,
    y: Math.sin(orbitAngle) * orbitRadius * tilt,
    depthFactor: Math.sin(orbitAngle), // -1 atrás del todo, +1 adelante del todo
    spinAngle: p.spinPhase + now * p.spinSpeed
  };
}

function drawOrbitPlanet(p, state, alphaMul) {
  const depthScale = 1 + state.depthFactor * 0.32;
  const depthAlpha = 0.55 + 0.45 * ((state.depthFactor + 1) / 2);
  const size = p.size * depthScale;

  ctx.fillStyle = `rgba(255, 90, 95, ${p.alpha * depthAlpha * alphaMul})`;
  ctx.shadowColor = "#ff6a60";
  ctx.shadowBlur = 6 * depthAlpha;

  drawSpinningShape(state.x, state.y, size, p.type, state.spinAngle);

  ctx.shadowBlur = 0;
}

// Estado final (ya explotó): las figuras quedan en órbita alrededor
// del centro para siempre, girando sobre su propio eje. Se dibuja en
// dos pasadas (back/front) para que las que están "atrás" queden
// detrás de la luz central y las que están "adelante" por encima.
function drawSolarSystemBack(now) {
  if (phase !== "expectativa" || !expectationExploded) return;

  const stage = getStage();
  const cx = stage.x + stage.width / 2;
  const cy = stage.y + stage.height / 2;
  const maxOrbit = getOrbitMaxRadius(stage);

  // Aparición suave apenas termina la ráfaga de la explosión, para
  // que no "salten" de golpe a su posición de órbita.
  const settleIn = Math.min(1, (now - expectationExplosionTime) / 900);

  ctx.save();
  ctx.translate(cx, cy);

  // Los anillos (líneas) del sistema solar se ven únicamente acá,
  // en el estado final — nunca mientras se está cargando.
  ctx.strokeStyle = `rgba(255, 120, 112, ${0.22 * settleIn})`;
  ctx.lineWidth = 1;

  for (let r = 82; r < maxOrbit; r += 42) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const p of planets) {
    const state = getOrbitPlanetState(p, maxOrbit, now);
    if (state.depthFactor > 0) continue; // esas se dibujan en el paso "front"

    drawOrbitPlanet(p, state, settleIn);
  }

  ctx.restore();
}

function drawSolarSystemFront(now) {
  if (phase !== "expectativa" || !expectationExploded) return;

  const stage = getStage();
  const cx = stage.x + stage.width / 2;
  const cy = stage.y + stage.height / 2;
  const maxOrbit = getOrbitMaxRadius(stage);
  const settleIn = Math.min(1, (now - expectationExplosionTime) / 900);

  ctx.save();
  ctx.translate(cx, cy);

  for (const p of planets) {
    const state = getOrbitPlanetState(p, maxOrbit, now);
    if (state.depthFactor <= 0) continue; // esas ya se dibujaron en "back"

    drawOrbitPlanet(p, state, settleIn);
  }

  ctx.restore();
}

function drawLight(now) {
  const stage = getStage();
  const cx = stage.x + stage.width / 2;
  const cy = stage.y + stage.height / 2;
  const flashPower = getExplosionBurstPower(now);

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

  // Estos tamaños estaban fijos en píxeles, pensados para una
  // ventana grande de escritorio. En mobile la ventana es mucho más
  // chica, así que la luz terminaba ocupando casi todo el recuadro y
  // tapaba las figuras/planetas de alrededor (sobre todo en
  // expectativa, que es la fase donde más crece). Achicamos ambos
  // tamaños en proporción al tamaño de la ventana, pero solo en
  // mobile: en escritorio "lightScale" da 1 y queda todo exactamente
  // igual que antes.
  const lightScale = isMobile
    ? Math.min(stage.width, stage.height) / 700
    : 1;

  const radius =
    (38 * distantLight +
      62 * anxietyMix * (1 - expectationMix) +
      76 * expectationMix +
      42 * flashPower) *
      lightScale +
    calmPulse * distantLight +
    anxiousPulse * anxietyMix * (1 - expectationMix) +
    stablePulse * expectationMix;

  const auraSize =
    (150 * distantLight +
      230 * anxietyMix * (1 - expectationMix) +
      340 * expectationMix +
      260 * flashPower) *
    lightScale;

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
  const burstPower = getExplosionBurstPower(now);

  if (burstPower <= 0) return;

  const stage = getStage();

  // Reddish en vez de blanco, para mantener la paleta de las 3 fases.
  ctx.fillStyle = `rgba(255, 90, 70, ${0.28 * burstPower})`;
  ctx.fillRect(stage.x, stage.y, stage.width, stage.height);
}

// Ansiedad: parpadeo ocasional de oscurecimiento, breve y poco
// frecuente (para que no pierda impacto), tipo "susto" de juegos de
// terror, seguido de la sensación de tensión que ya deja el resto de
// la escena (temblor, figuras que no se van).
function maybeTriggerDarkFlicker(now) {
  if (phase !== "ansiedad") return;

  // Solo puede aparecer mientras se está haciendo la interacción
  // (sosteniendo/deslizando) y una vez que el estado de ansiedad ya
  // arrancó de verdad (anxietyMix con algo de recorrido), no apenas
  // se entra a la fase o en momentos de calma sin interactuar.
  if (!accelerating || anxietyMix < 0.15) return;

  if (now < nextDarkFlickerCheckAt) return;

  // Cuanto más tiempo sostenido (anxietyMix más alto), más seguido
  // se chequea si aparece el parpadeo y más probable que aparezca.
  const intensity = Math.max(0, Math.min(1, (anxietyMix - 0.15) / 0.85));
  const minInterval = 4000 - intensity * 2800; // hasta ~1200ms
  const maxInterval = 9000 - intensity * 5500; // hasta ~3500ms

  nextDarkFlickerCheckAt =
    now + minInterval + Math.random() * (maxInterval - minInterval);

  const triggerChance = 0.35 + intensity * 0.4; // hasta 0.75

  if (!darkFlicker && Math.random() < triggerChance) {
    darkFlicker = {
      start: now,
      duration: 160 + Math.random() * 220
    };
  }
}

function drawDarkFlicker(now) {
  if (!darkFlicker) return;

  const elapsed = now - darkFlicker.start;

  if (elapsed > darkFlicker.duration) {
    darkFlicker = null;
    return;
  }

  const t = elapsed / darkFlicker.duration;
  // Sube y baja rápido, como un corte a negro tipo susto.
  const power = t < 0.5 ? t / 0.5 : 1 - (t - 0.5) / 0.5;

  const stage = getStage();
  ctx.fillStyle = `rgba(0, 0, 0, ${0.82 * power})`;
  ctx.fillRect(stage.x, stage.y, stage.width, stage.height);
}