const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let dpr = window.devicePixelRatio || 1;

function resize() {
  dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  createButtons();
}

window.addEventListener("resize", resize);

const palette = ["#d3770d", "#db8c32", "#db9f5c", "#dfbb91"];
const lightColor = "#dfbb91";

let currentSystem = "memoria";
let lastTap = 0;
const aggressiveThreshold = 220;

const memoryMarks = [];
const memoryTrails = [];
const memoryFlashes = [];
const heritageLevels = [];
const decayFigures = [];

let totalHeritageNodes = 0;
let buttons = [];

// Estado del gesto "mantener apretado" de Memoria (viene del
// sketch de Processing: la duración de la presión define el
// tamaño de la marca y si deja destello permanente).
let pressingMemory = false;
let memoryPressStart = 0;
let pointerX = 0;
let pointerY = 0;

resize();

//------------------------------------
// Interacción
//------------------------------------
canvas.addEventListener("mousedown", (e) => {
  pointerX = e.clientX;
  pointerY = e.clientY;
  handlePressStart(e.clientX, e.clientY);
});

window.addEventListener("mousemove", (e) => {
  pointerX = e.clientX;
  pointerY = e.clientY;
});

window.addEventListener("mouseup", () => {
  handlePressEnd();
});

canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    pointerX = touch.clientX;
    pointerY = touch.clientY;
    handlePressStart(touch.clientX, touch.clientY);
  },
  { passive: false }
);

canvas.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    pointerX = touch.clientX;
    pointerY = touch.clientY;
  },
  { passive: false }
);

window.addEventListener("touchend", () => {
  handlePressEnd();
});

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();

  if (key === "1") currentSystem = "memoria";
  if (key === "2") currentSystem = "herencia";
  if (key === "3") currentSystem = "caducidad";

  if (key === "k") {
    if (currentSystem === "memoria") currentSystem = "herencia";
    else if (currentSystem === "herencia") currentSystem = "caducidad";
    else currentSystem = "memoria";
  }
});

function handlePressStart(x, y) {
  if (!isMini && checkButtons(x, y)) return;

  const now = performance.now();
  const aggressive = now - lastTap < aggressiveThreshold;
  lastTap = now;

  if (currentSystem === "memoria") {
    pressingMemory = true;
    memoryPressStart = now;
    return;
  }

  if (currentSystem === "herencia") {
    addHeritageNode(aggressive);
  }

  if (currentSystem === "caducidad") {
    const type = aggressive ? 2 : Math.floor(Math.random() * 2);
    const color = randomFrom(palette);
    const life = random(3000, 6000);
    const size = random(50, 90);

    decayFigures.push(new DecayFigure(x, y, size, type, color, life));
  }
}

function handlePressEnd() {
  if (!pressingMemory) return;
  pressingMemory = false;

  if (currentSystem !== "memoria") return;

  addMemoryMark(pointerX, pointerY, performance.now() - memoryPressStart);
}

// Crea la nueva marca en (x, y) y, si había una marca previa,
// el rastro (línea) que las conecta. "duracion" es cuánto se
// mantuvo apretado, en ms.
function addMemoryMark(x, y, duracion) {
  const nueva = new MemoryMark(x, y, duracion);

  if (memoryMarks.length > 0) {
    const anterior = memoryMarks[memoryMarks.length - 1];
    memoryTrails.push(new MemoryTrail(anterior.x, anterior.y, nueva.x, nueva.y, duracion));
  }

  memoryMarks.push(nueva);
}

//------------------------------------
// Botones simples
//------------------------------------
function createButtons() {
  const w = window.innerWidth;
  const buttonW = Math.min(160, w * 0.28);
  const buttonH = 38;
  const gap = 10;
  const totalW = buttonW * 3 + gap * 2;
  const startX = w / 2 - totalW / 2;
  const y = 22;

  buttons = [
    { label: "Memoria", system: "memoria", x: startX, y, w: buttonW, h: buttonH },
    { label: "Herencia", system: "herencia", x: startX + buttonW + gap, y, w: buttonW, h: buttonH },
    { label: "Caducidad", system: "caducidad", x: startX + (buttonW + gap) * 2, y, w: buttonW, h: buttonH }
  ];
}

function checkButtons(x, y) {
  for (const button of buttons) {
    const inside =
      x >= button.x &&
      x <= button.x + button.w &&
      y >= button.y &&
      y <= button.y + button.h;

    if (inside) {
      currentSystem = button.system;
      return true;
    }
  }

  return false;
}

function drawButtons() {
  ctx.save();
  ctx.font = "13px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const button of buttons) {
    const active = button.system === currentSystem;

    ctx.fillStyle = active ? "rgba(211, 119, 13, 0.28)" : "rgba(10, 7, 14, 0.72)";
    ctx.strokeStyle = active ? "rgba(223, 187, 145, 0.72)" : "rgba(223, 187, 145, 0.28)";
    ctx.lineWidth = 1;

    roundedRect(button.x, button.y, button.w, button.h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = active ? "rgba(255, 226, 190, 0.95)" : "rgba(223, 187, 145, 0.7)";
    ctx.fillText(button.label, button.x + button.w / 2, button.y + button.h / 2);
  }

  ctx.restore();
}

//------------------------------------
// Animación
//------------------------------------
function animate(now) {
  requestAnimationFrame(animate);

  drawBaseBackground();

  if (currentSystem === "memoria") drawMemory();
  if (currentSystem === "herencia") drawHeritage(now);
  if (currentSystem === "caducidad") drawDecay();

  drawFrame();
  if (!isMini) drawButtons();
}

//------------------------------------
// Entrada directa por parámetro de URL (?estado=)
//------------------------------------
const urlParams = new URLSearchParams(window.location.search);
const estadoInicial = urlParams.get("estado");

if (["memoria", "herencia", "caducidad"].includes(estadoInicial)) {
  currentSystem = estadoInicial;
}

//------------------------------------
// Modo miniatura (?mini=1)
// Oculta los botones y simula clicks automáticos
// usando exactamente el mismo handlePressStart()/handlePressEnd()
// que dispara una presión real, para que se vea el
// comportamiento sin necesidad de interacción.
//------------------------------------
const isMini = urlParams.get("mini") === "1";

if (isMini) {
  // El ritmo de los clicks simulados se ajusta desde mini-sim-config.js
  // (window.MINI_SIM_CONFIG.click), no acá.
  const clickCfg = (window.MINI_SIM_CONFIG && window.MINI_SIM_CONFIG.click) || {};
  const clickIntervalMin = clickCfg.intervalMin ?? 5000;
  const clickIntervalMax = clickCfg.intervalMax ?? 6000;

  function scheduleMiniClick() {
    const wait = random(clickIntervalMin, clickIntervalMax);

    setTimeout(() => {
      if (!(currentSystem === "memoria" && memoryMarks.length >= 40)) {
        const x = random(40, window.innerWidth - 40);
        const y = random(40, window.innerHeight - 40);
        pointerX = x;
        pointerY = y;

        handlePressStart(x, y);

        // En Memoria simula que se mantiene apretado un rato
        // (variable, como una persona real) antes de soltar.
        const holdMs = currentSystem === "memoria" ? random(80, 2600) : 0;
        setTimeout(() => handlePressEnd(), holdMs);
      }

      scheduleMiniClick();
    }, wait);
  }

  scheduleMiniClick();
}

requestAnimationFrame(animate);

//------------------------------------
// Fondo común
//------------------------------------
function drawBaseBackground() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const cx = w / 2;
  const cy = h / 2;

  ctx.fillStyle = "#0b0a10";
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
  glow.addColorStop(0, "rgba(80, 38, 18, 0.16)");
  glow.addColorStop(0.48, "rgba(38, 18, 20, 0.16)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

function drawFrame() {
  ctx.save();
  ctx.noFill;
  ctx.strokeStyle = "rgba(90, 100, 120, 0.32)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(40, 76, window.innerWidth - 80, window.innerHeight - 116);
  ctx.restore();
}

//------------------------------------
// 1. Memoria
//------------------------------------
class MemoryMark {
  constructor(x, y, duracion = 0) {
    this.x = x;
    this.y = y;

    // Duración de la presión (ms) → tamaño del círculo.
    this.size = clampNum(mapRange(duracion, 0, 5000, 18, 80), 18, 80);
    this.alpha = 180;
    this.minAlpha = 0;

    // Presiones sostenidas (300ms o más) dejan un destello
    // permanente una vez que el círculo termina de desvanecerse.
    this.dejaDestello = duracion >= 300;
    this.intensidadDestello = clampNum(mapRange(duracion, 300, 5000, 50, 255), 50, 255);
  }

  update() {
    if (this.alpha > this.minAlpha) {
      this.alpha -= 0.5;
    }
  }

  show() {
    const a = this.alpha / 255;

    ctx.save();

    ctx.fillStyle = `rgba(255, 191, 117, ${a * 0.1})`;
    circle(this.x, this.y, this.size * 2.5);

    ctx.fillStyle = `rgba(255, 191, 117, ${a * 0.18})`;
    circle(this.x, this.y, this.size * 1.8);

    ctx.strokeStyle = `rgba(211, 119, 13, ${a})`;
    ctx.fillStyle = `rgba(211, 119, 13, ${a * 0.82})`;
    ctx.lineWidth = 1.4;
    circle(this.x, this.y, this.size);
    ctx.stroke();

    ctx.restore();
  }
}

// Rastro: la línea que conecta una marca con la siguiente.
// Nunca desaparece; cuanto más se sostuvo la presión, más
// marcada queda.
class MemoryTrail {
  constructor(x1, y1, x2, y2, duracion) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.alpha = clampNum(mapRange(duracion, 0, 5000, 25, 255), 25, 255);
  }

  show() {
    const a = this.alpha / 255;

    ctx.strokeStyle = `rgba(223, 187, 145, ${a})`;
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(this.x2, this.y2);
    ctx.stroke();
  }
}

// Destello: lo que queda para siempre en el lugar donde una
// marca "importante" (presión sostenida) terminó de desvanecerse.
class MemoryFlash {
  constructor(x, y, intensidad) {
    this.x = x;
    this.y = y;
    this.alpha = intensidad;
  }

  show() {
    const a = this.alpha / 255;

    ctx.save();
    ctx.fillStyle = `rgba(255, 191, 117, ${a * 0.12})`;
    circle(this.x, this.y, 25);

    ctx.fillStyle = `rgba(255, 220, 170, ${a})`;
    circle(this.x, this.y, 5);
    ctx.restore();
  }
}

function drawMemory() {
  ctx.save();

  for (const flash of memoryFlashes) {
    flash.show();
  }

  for (const trail of memoryTrails) {
    trail.show();
  }

  for (let i = memoryMarks.length - 1; i >= 0; i--) {
    const mark = memoryMarks[i];
    mark.update();
    mark.show();

    if (mark.alpha <= 0) {
      if (mark.dejaDestello) {
        memoryFlashes.push(new MemoryFlash(mark.x, mark.y, mark.intensidadDestello));
      }
      memoryMarks.splice(i, 1);
    }
  }

  // Círculo "cargando" mientras se mantiene apretado: sigue
  // al puntero y crece con la duración de la presión.
  if (currentSystem === "memoria" && pressingMemory) {
    const duracion = performance.now() - memoryPressStart;
    const tam = clampNum(mapRange(duracion, 0, 5000, 18, 80), 18, 80);

    ctx.strokeStyle = "rgba(211, 119, 13, 0.39)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pointerX, pointerY, tam / 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

//------------------------------------
// 2. Herencia
//------------------------------------
class HeritageNode {
  constructor(x, y, size, type, color, colorIndex, parent) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.type = type;
    this.color = color;
    this.colorIndex = colorIndex;
    this.parent = parent;
    this.birth = performance.now();
    this.particleT = Math.random();
    this.particleSpeed = random(0.006, 0.012);
  }

  updateParticle() {
    if (!this.parent) return;
    this.particleT += this.particleSpeed;
    if (this.particleT > 1) this.particleT = 0;
  }

  showLine() {
    if (!this.parent) return;

    ctx.strokeStyle = hexToRgba(this.color, 0.38);
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(this.parent.x, this.parent.y);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();
  }

  showParticle() {
    if (!this.parent) return;

    const px = lerp(this.parent.x, this.x, this.particleT);
    const py = lerp(this.parent.y, this.y, this.particleT);

    ctx.fillStyle = "rgba(223, 187, 145, 0.22)";
    circle(px, py, 14);

    ctx.fillStyle = "rgba(223, 187, 145, 0.86)";
    circle(px, py, 6);
  }

  show() {
    const age = performance.now() - this.birth;
    const glow = Math.max(0, 1 - age / 450);

    ctx.save();

    if (glow > 0) {
      ctx.fillStyle = hexToRgba(this.color, 0.28 * glow);
      drawShape(this.x, this.y, this.size * (1.55 + glow * 0.35), this.type);
    }

    ctx.fillStyle = this.color;
    drawShape(this.x, this.y, this.size, this.type);

    ctx.restore();
  }
}

function addHeritageNode(aggressive) {
  const maxLevels = window.innerWidth < 768 ? 4 : 5;

  let n = totalHeritageNodes;
  let level = 0;

  while (n >= Math.pow(2, level)) {
    n -= Math.pow(2, level);
    level++;
  }

  const index = n;

  if (level >= maxLevels) return;

  while (heritageLevels.length <= level) {
    heritageLevels.push([]);
  }

  const nodesInLevel = Math.pow(2, level);
  const x = (window.innerWidth * (index + 1)) / (nodesInLevel + 1);
  const topY = window.innerWidth < 768 ? 120 : 115;
  const levelHeight = window.innerWidth < 768 ? 105 : 125;
  const y = topY + level * levelHeight;

  const rootSize = window.innerWidth < 768 ? 48 : 60;
  const size = rootSize * Math.pow(0.78, level);

  let parent = null;

  if (level > 0) {
    parent = heritageLevels[level - 1][Math.floor(index / 2)];
  }

  let type;
  let colorIndex;

  if (level === 0) {
    type = 0;
    colorIndex = 0;
  } else if (aggressive) {
    type = 2;

    do {
      colorIndex = Math.floor(Math.random() * palette.length);
    } while (colorIndex === parent.colorIndex);
  } else {
    const inheritsShape = Math.random() < 0.5;

    if (inheritsShape) {
      type = parent.type;

      do {
        colorIndex = Math.floor(Math.random() * palette.length);
      } while (colorIndex === parent.colorIndex);
    } else {
      colorIndex = parent.colorIndex;

      if (parent.type === 0) type = 1;
      else if (parent.type === 1) type = 0;
      else type = Math.floor(Math.random() * 2);
    }

    const existing = heritageLevels[level].length;

    if (existing === nodesInLevel - 1) {
      let allSame = true;

      for (const node of heritageLevels[level]) {
        if (node.type !== type) {
          allSame = false;
          break;
        }
      }

      if (allSame) {
        type = type === 0 ? 1 : 0;

        if (type === parent.type) {
          do {
            colorIndex = Math.floor(Math.random() * palette.length);
          } while (colorIndex === parent.colorIndex);
        } else {
          colorIndex = parent.colorIndex;
        }
      }
    }
  }

  const node = new HeritageNode(
    x,
    y,
    size,
    type,
    palette[colorIndex],
    colorIndex,
    parent
  );

  heritageLevels[level].push(node);
  totalHeritageNodes++;
}

function drawHeritage(now) {
  ctx.save();

  for (let level = 1; level < heritageLevels.length; level++) {
    for (const node of heritageLevels[level]) {
      node.updateParticle();
      node.showLine();
      node.showParticle();
    }
  }

  for (const level of heritageLevels) {
    for (const node of level) {
      node.show();
    }
  }

  ctx.restore();
}

//------------------------------------
// 3. Caducidad
//------------------------------------
class DecayFigure {
  constructor(x, y, size, type, color, life) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.type = type;
    this.color = color;
    this.life = life;
    this.birth = performance.now();
    this.seed = Math.random() * 1000;
  }

  remaining() {
    const elapsed = performance.now() - this.birth;
    return Math.max(0, 1 - elapsed / this.life);
  }

  dead() {
    return this.remaining() <= 0;
  }

  show() {
    const remaining = this.remaining();
    const opacity = remaining;
    const currentColor = desaturate(this.color, remaining);

    ctx.save();

    ctx.fillStyle = hexToRgba(currentColor, opacity * 0.28);
    drawShape(this.x, this.y, this.size * 1.85, this.type);

    ctx.fillStyle = hexToRgba(currentColor, opacity * 0.82);
    drawShape(this.x, this.y, this.size, this.type);

    const brokenLine =
      remaining < 0.32 &&
      Math.sin(performance.now() * 0.018 + this.seed) > -0.1;

    if (!brokenLine) {
      ctx.strokeStyle = hexToRgba(currentColor, opacity);
      ctx.lineWidth = 1.4;
      ctx.fillStyle = "transparent";
      drawShape(this.x, this.y, this.size, this.type, true);
    }

    ctx.restore();
  }
}

function drawDecay() {
  for (let i = decayFigures.length - 1; i >= 0; i--) {
    const figure = decayFigures[i];
    figure.show();

    if (figure.dead()) {
      decayFigures.splice(i, 1);
    }
  }
}

//------------------------------------
// Utilidades
//------------------------------------
function drawShape(x, y, size, type, strokeOnly = false) {
  const r = size / 2;

  ctx.beginPath();

  if (type === 0) {
    ctx.arc(x, y, r, 0, Math.PI * 2);
  } else if (type === 1) {
    ctx.rect(x - r, y - r, size, size);
  } else {
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.87, y + r * 0.5);
    ctx.lineTo(x - r * 0.87, y + r * 0.5);
    ctx.closePath();
  }

  if (strokeOnly) ctx.stroke();
  else ctx.fill();
}

function circle(x, y, size) {
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fill();
}

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

// Equivalentes a map()/constrain() de Processing.
function mapRange(value, inMin, inMax, outMin, outMax) {
  const t = (value - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
}

function clampNum(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function desaturate(hex, amount) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);

  const gray = (r + g + b) / 3;

  const nr = Math.round(lerp(gray, r, amount));
  const ng = Math.round(lerp(gray, g, amount));
  const nb = Math.round(lerp(gray, b, amount));

  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
}

function toHex(n) {
  return n.toString(16).padStart(2, "0");
}