const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let dpr = window.devicePixelRatio || 1;
const isMobile = window.innerWidth < 768;

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

// Cambia el estado actual y deja el parámetro ?estado= de la URL
// sincronizado (sin recargar la página), para que las flechas de
// subsystem-nav.js sepan desde dónde partir en vez de quedarse con
// el estado que había al cargar la página.
function switchSystem(name) {
  currentSystem = name;

  const url = new URL(window.location.href);
  url.searchParams.set("estado", name);
  window.history.replaceState({}, "", url);
}


const memoryMarks = [];
const memoryTrails = [];
const memoryFlashes = [];
const heritageNodes = [];
const decayFigures = [];

let familyCounter = 0;
let buttons = [];

// Estado del gesto "mantener apretado" de Memoria (viene del
// sketch de Processing: la duración de la presión define el
// tamaño de la marca y si deja destello permanente).
let pressingMemory = false;
let memoryPressStart = 0;
let pointerX = 0;
let pointerY = 0;

// Guarda permanentemente la posición del último toque, aunque la
// marca que lo generó ya se haya desvanecido del todo. El rastro
// hacia el toque siguiente siempre parte de acá, no de la última
// marca que siga viva en pantalla (igual que ultimoX/ultimoY/
// existeAnterior en el sketch original).
let memoryLastX = 0;
let memoryLastY = 0;
let memoryHasPrevious = false;

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

  if (key === "1") switchSystem("memoria");
  if (key === "2") switchSystem("herencia");
  if (key === "3") switchSystem("caducidad");

  if (key === "k") {
    if (currentSystem === "memoria") switchSystem("herencia");
    else if (currentSystem === "herencia") switchSystem("caducidad");
    else switchSystem("memoria");
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
    addHeritageNode(x, y);
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

// Crea la nueva marca en (x, y) y, si ya hubo un toque antes (en
// cualquier momento, aunque su marca ya se haya desvanecido), el
// rastro (línea) que lo conecta con este.
function addMemoryMark(x, y, duracion) {
  const nueva = new MemoryMark(x, y, duracion);

  if (memoryHasPrevious) {
    memoryTrails.push(new MemoryTrail(memoryLastX, memoryLastY, nueva.x, nueva.y));
  }

  memoryLastX = nueva.x;
  memoryLastY = nueva.y;
  memoryHasPrevious = true;

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
      switchSystem(button.system);
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
// Fondo unificado de las 9 experiencias: delega en la única
// implementación compartida (shared-background.js), la misma
// que usan subsistema2.js y script.js.
function drawBaseBackground() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  drawSharedBackground(ctx, w, h);
}

// Igual que getStage() en script.js/subsistema2.js: la "ventana" de
// interacción. En escritorio es el mismo rectángulo de siempre; en
// mobile, en vez de dejar que se estire verticalmente, la volvemos
// cuadrada (lado más chico entre ancho y alto) y la centramos.
function getStage() {
  const margin = 40;
  const top = 76;
  const bottom = 40;

  if (isMobile) {
    const availWidth = window.innerWidth - margin * 2;
    const availHeight = window.innerHeight - top - bottom;
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
    width: window.innerWidth - margin * 2,
    height: window.innerHeight - top - bottom
  };
}

function drawFrame() {
  const stage = getStage();

  ctx.save();
  ctx.noFill;
  ctx.strokeStyle = "rgba(90, 100, 120, 0.32)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(stage.x, stage.y, stage.width, stage.height);
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

    // Presiones sostenidas (300ms o más) dejan un destello
    // permanente una vez que el círculo termina de desvanecerse.
    this.dejaDestello = duracion >= 300;
    this.intensidadDestello = clampNum(mapRange(duracion, 300, 5000, 50, 255), 50, 255);

    // Cuántos aros concéntricos tendrá ese destello: a más tiempo
    // sostenido, más capas.
    this.cantidadAros = clampNum(Math.round(mapRange(duracion, 300, 5000, 1, 8)), 1, 8);
  }

  update() {
    // La desaparición del círculo no depende del tiempo de presión.
    this.alpha -= 0.5;
  }

  show() {
    const a = this.alpha / 255;

    ctx.save();

    ctx.fillStyle = `rgba(255, 191, 117, ${a * 0.1})`;
    circle(this.x, this.y, this.size * 2.5);

    ctx.fillStyle = `rgba(255, 191, 117, ${a * 0.18})`;
    circle(this.x, this.y, this.size * 1.8);

    ctx.strokeStyle = `rgba(211, 119, 13, ${a})`;
    ctx.fillStyle = `rgba(211, 119, 13, ${a})`;
    ctx.lineWidth = 1.5;
    circle(this.x, this.y, this.size);
    ctx.stroke();

    ctx.restore();
  }
}

// Rastro: la línea que conecta un toque con el siguiente. Nunca
// desaparece, y a diferencia de las marcas y los destellos, la
// duración de la presión no la afecta en nada: todos los rastros
// tienen siempre el mismo color, la misma opacidad y el mismo grosor.
class MemoryTrail {
  constructor(x1, y1, x2, y2) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }

  show() {
    ctx.strokeStyle = "rgba(223, 187, 145, 0.196)";
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(this.x2, this.y2);
    ctx.stroke();
  }
}

// Destello: lo que queda para siempre en el lugar donde una marca
// "importante" (presión sostenida) terminó de desvanecerse. Son
// varias capas circulares blancas y translúcidas, construidas de
// afuera hacia adentro, más un punto blanco sólido en el centro.
class MemoryFlash {
  constructor(x, y, intensidad, cantidadAros) {
    this.x = x;
    this.y = y;
    this.alpha = intensidad;
    this.cantidadAros = cantidadAros;
  }

  show() {
    const a = this.alpha / 255;

    ctx.save();

    for (let i = this.cantidadAros; i >= 1; i--) {
      const tamCapa = 5 + i * 10;
      const opacidad = a * 0.16;

      ctx.fillStyle = `rgba(255, 255, 255, ${opacidad})`;
      circle(this.x, this.y, tamCapa);
    }

    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    circle(this.x, this.y, 5);

    ctx.restore();
  }
}

function drawMemory() {
  ctx.save();

  for (const trail of memoryTrails) {
    trail.show();
  }

  for (const flash of memoryFlashes) {
    flash.show();
  }

  for (let i = memoryMarks.length - 1; i >= 0; i--) {
    const mark = memoryMarks[i];
    mark.update();
    mark.show();

    if (mark.alpha <= 0) {
      if (mark.dejaDestello) {
        memoryFlashes.push(new MemoryFlash(mark.x, mark.y, mark.intensidadDestello, mark.cantidadAros));
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
// Adaptado del sketch de Processing: en vez de un árbol binario de
// posiciones fijas, cada click suelta un nodo en el lugar donde se
// tocó. Si cae cerca de otro nodo "disponible" (que todavía no formó
// pareja), ambos se combinan y aparece un hijo que mezcla su forma
// y su color. Las familias envejecen: pasadas varias generaciones
// sin renovarse, sus nodos se apagan a un gris cálido y se
// desvanecen.
//
// Dos agregados sobre el sketch original:
// 1) Los hijos ya emparejados (generación >= 2) siguen "disponibles":
//    si con el tiempo dos hijos de familias distintas terminan cerca,
//    se unen solos, sin necesidad de un click nuevo. Así las familias
//    dejan de quedar como árboles aislados y se van entramando entre
//    sí.
// 2) De forma poco frecuente, un hijo puede salir "anómalo": una
//    figura de otra forma y otro color (el mismo celeste con el que
//    "Incertidumbre" marca sus propias anomalías), como si el linaje
//    se torciera por un instante antes de seguir su curso normal.
const grisCalido = "#78695f";
const colorAnomalia = "#78c8ff";
const probabilidadAnomalia = 0.045;

// Distancia máxima para que dos nodos formen pareja y el desnivel
// que separa a un hijo de sus padres, en la escala "de diseño"
// (pensada para un escritorio de ~900px de ancho). heritageScale()
// la reduce en mobile para que la dinámica no se salga del recuadro.
const distanciaPareja = 130;
const desnivelHijo = 80;
const tamanoMinBase = 36;
const tamanoMaxBase = 50;

function heritageScale() {
  const stage = getStage();
  return clampNum(stage.width / 620, 0.55, 1);
}

function heritageMargin(scale) {
  return (tamanoMaxBase * scale) / 2 + 10 * scale;
}

class HeritageNode {
  constructor(x, y, size, type, colorIndex, parent1, parent2, parent1PassesShape, generation, familyId) {
    this.x = x;
    this.y = y;
    this.yTarget = y;
    this.size = size;
    this.type = type;
    this.colorIndex = colorIndex;
    this.baseColor = palette[colorIndex];
    this.currentColor = this.baseColor;
    this.currentAlpha = 255;
    this.isAnomaly = false;
    // Cuánto queda del "gen" anómalo (triángulo/celeste) para seguir
    // pasándolo a la próxima generación. 0 = no lo lleva. Se reduce a
    // la mitad cada vez que se transmite, hasta perderse del todo.
    this.anomalyGeneStrength = 0;

    this.parent1 = parent1;
    this.parent2 = parent2;
    this.parent1PassesShape = parent1PassesShape;
    this.available = true;

    this.generation = generation;
    this.familyId = familyId;
    this.decayState = 0;

    this.birth = performance.now();
    this.particleT = 0;
    this.particleSpeed = 0.012;
  }

  updatePosition() {
    this.y = lerp(this.y, this.yTarget, 0.08);
  }

  updateDecay() {
    let targetColor = this.baseColor;
    let targetAlpha = 255;

    if (this.decayState === 1) {
      targetColor = grisCalido;
      targetAlpha = 255;
    } else if (this.decayState === 2) {
      targetColor = grisCalido;
      targetAlpha = 60;
    } else if (this.decayState >= 3) {
      targetColor = grisCalido;
      targetAlpha = 0;
    }

    this.currentColor = lerpColorHex(this.currentColor, targetColor, 0.05);
    this.currentAlpha = lerp(this.currentAlpha, targetAlpha, 0.05);
  }

  updateParticle() {
    if (this.parent1 || this.parent2) {
      this.particleT += this.particleSpeed;
      if (this.particleT > 1) this.particleT = 0;
    }
  }

  showLine() {
    if (this.currentAlpha <= 1) return;

    ctx.lineWidth = 1;

    if (this.parent1 && this.parent1.currentAlpha > 1) {
      const a = (Math.min(this.currentAlpha, this.parent1.currentAlpha) / 255) * 0.4;
      ctx.strokeStyle = hexToRgba(this.currentColor, a);
      ctx.beginPath();
      ctx.moveTo(this.parent1.x, this.parent1.y);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
    }

    if (this.parent2 && this.parent2.currentAlpha > 1) {
      const a = (Math.min(this.currentAlpha, this.parent2.currentAlpha) / 255) * 0.4;
      ctx.strokeStyle = hexToRgba(this.currentColor, a);
      ctx.beginPath();
      ctx.moveTo(this.parent2.x, this.parent2.y);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
    }
  }

  showParticle() {
    if (this.currentAlpha <= 1) return;
    if (this.parent1) this.drawLight(this.parent1, this.parent1PassesShape);
    if (this.parent2) this.drawLight(this.parent2, !this.parent1PassesShape);
  }

  // Dibuja el pulso que viaja de un padre al hijo. Si ese padre fue
  // quien "pasó su forma", el pulso queda grande y tenue (un rasgo
  // diluido); si no, queda chico y sólido (el rasgo que predominó).
  drawLight(donor, passedShape) {
    if (donor.currentAlpha <= 1) return;

    const px = lerp(donor.x, this.x, this.particleT);
    const py = lerp(donor.y, this.y, this.particleT);
    const alphaMult = Math.min(this.currentAlpha, donor.currentAlpha) / 255;

    if (passedShape) {
      ctx.fillStyle = hexToRgba(donor.currentColor, 0.32 * alphaMult);
      drawShape(px, py, 15, donor.type);
    } else {
      ctx.fillStyle = hexToRgba(donor.currentColor, 1 * alphaMult);
      drawShape(px, py, 11, donor.type);
    }
  }

  show() {
    this.updateDecay();
    if (this.currentAlpha <= 1) return;

    const age = performance.now() - this.birth;
    const glow = Math.max(0, 1 - age / 450);
    const alphaMult = this.currentAlpha / 255;

    ctx.save();

    // Las anomalías llevan un resplandor celeste propio, el mismo
    // lenguaje que usa Incertidumbre para marcar lo que se sale de lo
    // esperado.
    if (this.isAnomaly) {
      ctx.shadowColor = colorAnomalia;
      ctx.shadowBlur = 16;
    }

    if (glow > 0) {
      ctx.fillStyle = hexToRgba(this.currentColor, 0.28 * glow * alphaMult);
      drawShape(this.x, this.y, this.size * (1.5 + glow * 0.4), this.type);
    }

    ctx.fillStyle = hexToRgba(this.currentColor, alphaMult);
    drawShape(this.x, this.y, this.size, this.type);

    ctx.restore();
  }
}

// Combina dos nodos disponibles en un hijo nuevo. Sirve tanto para
// la pareja que se arma al soltar un click como para el cruce
// espontáneo entre hijos de familias distintas.
function pairHeritageNodes(nodeA, nodeB, scale, stage) {
  const margen = heritageMargin(scale);
  const sizeMin = tamanoMinBase * scale;
  const sizeMax = tamanoMaxBase * scale;

  const aPasaForma = Math.random() < 0.5;
  let hijoTipo, hijoColorIndex;

  if (aPasaForma) {
    hijoTipo = nodeB.type;
    hijoColorIndex = nodeA.colorIndex;
  } else {
    hijoTipo = nodeA.type;
    hijoColorIndex = nodeB.colorIndex;
  }

  const familiaActiva = nodeB.familyId;
  nodeA.familyId = familiaActiva;
  nodeA.generation = nodeB.generation;

  const hijoXsinRecortar = (nodeA.x + nodeB.x) / 2;
  const hijoX = clampNum(hijoXsinRecortar, stage.x + margen, stage.x + stage.width - margen);
  const hijoY = Math.max(nodeA.yTarget, nodeB.yTarget) + desnivelHijo * scale;
  const hijoGen = nodeB.generation + 1;
  const hijoSize = random(sizeMin, sizeMax);

  const hijo = new HeritageNode(
    hijoX,
    hijoY,
    hijoSize,
    hijoTipo,
    hijoColorIndex,
    nodeB,
    nodeA,
    aPasaForma,
    hijoGen,
    familiaActiva
  );

  // Anomalía: de forma aleatoria, un eslabón puede mutar del todo, con
  // una forma y un color ajenos a la paleta familiar.
  if (Math.random() < probabilidadAnomalia) {
    hijo.isAnomaly = true;
    hijo.type = 2;
    hijo.baseColor = colorAnomalia;
    hijo.currentColor = colorAnomalia;
    hijo.anomalyGeneStrength = 1;
  } else {
    // El triángulo anómalo también puede dejar algo de sí en el
    // linaje de abajo: si alguno de los padres todavía carga ese
    // "gen", por probabilidad pasa una parte suya (forma o color,
    // no las dos) al hijo. La fuerza del gen se reduce a la mitad en
    // cada transmisión, así el rasgo se va perdiendo generación tras
    // generación hasta desaparecer.
    const genDonor = nodeA.anomalyGeneStrength >= nodeB.anomalyGeneStrength ? nodeA : nodeB;
    if (genDonor.anomalyGeneStrength > 0 && Math.random() < genDonor.anomalyGeneStrength) {
      if (Math.random() < 0.5) {
        hijo.type = 2;
      } else {
        hijo.baseColor = colorAnomalia;
        hijo.currentColor = colorAnomalia;
      }
      hijo.anomalyGeneStrength = genDonor.anomalyGeneStrength * 0.5;
    }
  }

  heritageNodes.push(hijo);

  nodeA.available = false;
  nodeB.available = false;

  for (const n of heritageNodes) {
    if (n.familyId === familiaActiva) {
      const diferenciaGen = hijoGen - n.generation;
      if (diferenciaGen >= 6) n.decayState = 3;
      else if (diferenciaGen === 5) n.decayState = 2;
      else if (diferenciaGen === 4) n.decayState = 1;
    }
  }
}

function addHeritageNode(clickX, clickY) {
  const scale = heritageScale();
  const stage = getStage();
  const margen = heritageMargin(scale);
  const sizeMin = tamanoMinBase * scale;
  const sizeMax = tamanoMaxBase * scale;

  familyCounter++;
  const familyId = familyCounter;

  const type = Math.floor(random(0, 2));
  const last = heritageNodes[heritageNodes.length - 1];
  let colorIndex;

  if (last) {
    if (type === last.type) {
      do {
        colorIndex = Math.floor(Math.random() * palette.length);
      } while (colorIndex === last.colorIndex);
    } else {
      colorIndex = Math.floor(Math.random() * palette.length);
    }
  } else {
    colorIndex = Math.floor(Math.random() * palette.length);
  }

  const posX = clampNum(clickX, stage.x + margen, stage.x + stage.width - margen);
  const posY = Math.max(clickY, stage.y + margen);
  const size = random(sizeMin, sizeMax);

  const nuevo = new HeritageNode(posX, posY, size, type, colorIndex, null, null, false, 1, familyId);
  heritageNodes.push(nuevo);

  let pareja = null;
  let minDist = Infinity;

  for (const n of heritageNodes) {
    if (n !== nuevo && n.available) {
      const d = Math.hypot(nuevo.x - n.x, nuevo.yTarget - n.yTarget);
      if (d < minDist) {
        minDist = d;
        pareja = n;
      }
    }
  }

  if (pareja && minDist <= distanciaPareja * scale) {
    pairHeritageNodes(nuevo, pareja, scale, stage);
  }
}

// Cruce espontáneo entre hijos de familias distintas que quedaron
// cerca uno del otro, para que las familias no queden como islas
// desconectadas entre sí.
function checkHeritageMerges(scale, stage) {
  for (let i = 0; i < heritageNodes.length; i++) {
    const a = heritageNodes[i];
    if (!a.available || a.generation < 2 || a.currentAlpha <= 1) continue;

    for (let j = i + 1; j < heritageNodes.length; j++) {
      const b = heritageNodes[j];
      if (!b.available || b.generation < 2 || b.currentAlpha <= 1) continue;
      if (a.familyId === b.familyId) continue;

      const d = Math.hypot(a.x - b.x, a.yTarget - b.yTarget);
      if (d <= distanciaPareja * scale) {
        pairHeritageNodes(a, b, scale, stage);
        return; // alcanza con un cruce por frame
      }
    }
  }
}

// Si la familia crece por debajo del recuadro, se corre todo hacia
// arriba para que siga siendo visible (el "scroll" del sketch
// original). Corre en cada frame para reaccionar también a los
// cruces espontáneos entre hijos.
function settleHeritageBounds(scale, stage) {
  if (heritageNodes.length === 0) return;

  const limiteInferior = stage.y + stage.height - 55 * scale;
  let maxY = 0;

  for (const n of heritageNodes) {
    if (n.yTarget > maxY) maxY = n.yTarget;
  }

  if (maxY > limiteInferior) {
    const desplazamiento = maxY - limiteInferior;
    for (const n of heritageNodes) {
      n.yTarget -= desplazamiento;
    }
  }
}

// Poda los nodos ya completamente apagados para que la simulación
// (sobre todo la miniatura, que corre indefinidamente) no acumule
// nodos invisibles para siempre. Como su línea y su partícula ya no
// se dibujan (currentAlpha <= 1), cortar el vínculo con sus hijos
// antes de borrarlos no cambia nada en pantalla.
function pruneHeritageNodes() {
  for (let i = heritageNodes.length - 1; i >= 0; i--) {
    const n = heritageNodes[i];
    if (n.decayState >= 3 && n.currentAlpha <= 1) {
      for (const m of heritageNodes) {
        if (m.parent1 === n) m.parent1 = null;
        if (m.parent2 === n) m.parent2 = null;
      }
      heritageNodes.splice(i, 1);
    }
  }
}

function drawHeritage(now) {
  const scale = heritageScale();
  const stage = getStage();

  checkHeritageMerges(scale, stage);
  settleHeritageBounds(scale, stage);
  pruneHeritageNodes();

  ctx.save();

  for (const node of heritageNodes) {
    node.updatePosition();
    node.updateParticle();
    node.showLine();
    node.showParticle();
  }

  for (const node of heritageNodes) {
    node.show();
  }

  ctx.restore();
}//------------------------------------
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

function lerpColorHex(hexA, hexB, t) {
  const a = hexA.replace("#", "");
  const b = hexB.replace("#", "");
  const ar = parseInt(a.slice(0, 2), 16);
  const ag = parseInt(a.slice(2, 4), 16);
  const ab = parseInt(a.slice(4, 6), 16);
  const br = parseInt(b.slice(0, 2), 16);
  const bg = parseInt(b.slice(2, 4), 16);
  const bb = parseInt(b.slice(4, 6), 16);

  const nr = Math.round(lerp(ar, br, t));
  const ng = Math.round(lerp(ag, bg, t));
  const nb = Math.round(lerp(ab, bb, t));

  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
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