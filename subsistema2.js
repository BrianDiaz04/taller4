const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let dpr = window.devicePixelRatio || 1;
let W = window.innerWidth;
let H = window.innerHeight;

function resize() {
  dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;

  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  createButtons();
}

window.addEventListener("resize", resize);

//------------------------------------
// Estado general
//------------------------------------
let currentWork = "sinergias";
let buttons = [];
let pointer = { x: 0, y: 0, px: 0, py: 0, down: false };

const works = ["sinergias", "ramas", "ruptura"];

resize();

//------------------------------------
// Input
//------------------------------------
canvas.addEventListener("mousedown", (e) => {
  pointer.down = true;
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.px = e.clientX;
  pointer.py = e.clientY;

  if (checkButtons(pointer.x, pointer.y)) return;

  if (currentWork === "sinergias") synergyMousePressed();
  if (currentWork === "ramas") empathyMousePressed(pointer.x, pointer.y);
  if (currentWork === "ruptura") ruptureMousePressed(pointer.x, pointer.y);
});

window.addEventListener("mousemove", (e) => {
  pointer.px = pointer.x;
  pointer.py = pointer.y;
  pointer.x = e.clientX;
  pointer.y = e.clientY;
});

window.addEventListener("mouseup", () => {
  pointer.down = false;
  synergyMouseReleased();
  empathyMouseReleased();
  ruptureMouseReleased();
});

canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    const t = e.touches[0];

    pointer.down = true;
    pointer.x = t.clientX;
    pointer.y = t.clientY;
    pointer.px = t.clientX;
    pointer.py = t.clientY;

    if (checkButtons(pointer.x, pointer.y)) return;

    if (currentWork === "sinergias") synergyMousePressed();
    if (currentWork === "ramas") empathyMousePressed(pointer.x, pointer.y);
    if (currentWork === "ruptura") ruptureMousePressed(pointer.x, pointer.y);
  },
  { passive: false }
);

canvas.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    const t = e.touches[0];

    pointer.px = pointer.x;
    pointer.py = pointer.y;
    pointer.x = t.clientX;
    pointer.y = t.clientY;
  },
  { passive: false }
);

window.addEventListener("touchend", () => {
  pointer.down = false;
  synergyMouseReleased();
  empathyMouseReleased();
  ruptureMouseReleased();
});

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();

  if (key === "1") switchWork("sinergias");
  if (key === "2") switchWork("ramas");
  if (key === "3") switchWork("ruptura");

  if (key === "k") {
    const index = works.indexOf(currentWork);
    switchWork(works[(index + 1) % works.length]);
  }
});

function switchWork(name) {
  currentWork = name;

  const url = new URL(window.location.href);
  url.searchParams.set("estado", name);
  window.history.replaceState({}, "", url);
}

//------------------------------------
// Botones
//------------------------------------
function createButtons() {
  const gap = 10;
  const bw = Math.min(190, W * 0.29);
  const bh = 38;
  const total = bw * 3 + gap * 2;
  const x0 = W / 2 - total / 2;

  buttons = [
    { label: "Colaboracion", work: "sinergias", x: x0, y: 18, w: bw, h: bh },
    { label: "Empatia", work: "ramas", x: x0 + bw + gap, y: 18, w: bw, h: bh },
    { label: "Identidad", work: "ruptura", x: x0 + (bw + gap) * 2, y: 18, w: bw, h: bh }
  ];
}

function checkButtons(x, y) {
  for (const b of buttons) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      switchWork(b.work);
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

  for (const b of buttons) {
    const active = currentWork === b.work;

    ctx.fillStyle = active ? "rgba(120, 200, 235, 0.24)" : "rgba(8, 7, 14, 0.78)";
    ctx.strokeStyle = active ? "rgba(180, 225, 245, 0.72)" : "rgba(180, 225, 245, 0.24)";
    ctx.lineWidth = 1;

    roundedRect(b.x, b.y, b.w, b.h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = active ? "rgba(220, 240, 250, 0.96)" : "rgba(200, 220, 230, 0.68)";
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
  }

  ctx.restore();
}

// Fondo unificado de las 9 experiencias: delega en la única
// implementación compartida (shared-background.js), la misma
// que usan subsistema.js y script.js.
function drawBaseBackground(glow = 0) {
  drawSharedBackground(ctx, W, H, glow);
}

//------------------------------------
// "Escenario" (zona con margen donde
// pasa todo el contenido interactivo),
// igual que subsistema.js (drawFrame)
// y script.js (getStage/drawStageFrame).
//------------------------------------
function getStage() {
  const isMobile = W < 768;
  // En mobile usamos los mismos márgenes que el subsistema 1
  // (margin 40, top 76, bottom 40) para que la ventana de
  // interacción tenga el mismo tamaño y posición en todas las
  // experiencias. En escritorio no se toca nada.
  const margin = isMobile ? 40 : 40;
  const top = isMobile ? 76 : 76;
  const bottom = isMobile ? 40 : 40;

  // Igual que en script.js: en mobile el rectángulo disponible queda
  // muy alargado verticalmente, así que la volvemos cuadrada usando
  // el lado más chico y centrándola. En escritorio no cambia nada.
  if (isMobile) {
    const availWidth = W - margin * 2;
    const availHeight = H - top - bottom;
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
    width: W - margin * 2,
    height: H - top - bottom
  };
}

function drawStageFrame() {
  const stage = getStage();

  ctx.save();
  ctx.strokeStyle = "rgba(255, 205, 200, 0.28)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(stage.x, stage.y, stage.width, stage.height);
  ctx.restore();
}

//------------------------------------
// 1. Colaboracion - union manual
//------------------------------------
// A diferencia del resto de las experiencias, acá el vínculo no
// aparece solo: hay que arrastrar una figura hasta otra igual y
// soltarla cerca para que se fusionen. De esa unión nace un círculo
// de control que sostiene al grupo; y esos círculos, si se juntan
// entre sí, arman un aro mayor que reúne a todos los grupos en el
// centro de la escena.
const synergy = {
  shapes: [],
  particles: [],
  dragged: null,
  connectionDist: 70,
  snapSpeed: 0.15,
  globalGlow: 0,
  nextGroupId: 0,
  superRing: [],
  // Mismos tonos que la paleta de Empatia (ver const empathy.colors
  // mas abajo), asi el relleno que aparece al unir figuras se lee
  // como el mismo lenguaje de color en las dos experiencias.
  colors: {
    triangle: [0, 245, 212],
    square: [4, 139, 133],
    circle: [72, 202, 228],
    celeste: [150, 205, 240],
    idle: [100, 105, 115]
  }
};

class SynergyShape {
  constructor(type, x, y) {
    this.type = type; // 0: triángulo, 1: cuadrado, 2: círculo (control)
    this.pos = vec(x, y);
    this.target = vec(x, y);
    this.vel = randomVec(random(0.2, 0.6));
    this.groupId = -1;
    this.linkedGroupId = -1; // para los círculos de control: qué grupo mandan
    this.size = 30;
    this.angle = random(0, Math.PI * 2);
    this.dragging = false;
    this.grouped = false;
    this.isControlNode = false;
    this.currentColor = [...synergy.colors.idle];
    this.targetColor = [...synergy.colors.idle];

    // En mobile las figuras de Colaboracion se reducen un 25% frente
    // a su tamaño original (30px). En escritorio no cambia nada.
    if (W < 768) this.size = this.size * 0.75;
  }

  updatePhysics() {
    const stage = getStage();

    if (this.dragging) {
      const dx = pointer.x - pointer.px;
      const dy = pointer.y - pointer.py;

      if (this.grouped || this.isControlNode) {
        // Al arrastrar una figura o un círculo se mueve todo el grupo unido a él
        const targetGroup = this.isControlNode ? this.linkedGroupId : this.groupId;

        if (this.isControlNode) {
          const idx = synergy.superRing.indexOf(this);
          if (idx !== -1) synergy.superRing.splice(idx, 1);
        }

        for (const s of synergy.shapes) {
          if ((s.groupId === targetGroup && targetGroup !== -1) || (s.isControlNode && s.linkedGroupId === targetGroup)) {
            s.pos.x += dx;
            s.pos.y += dy;
            s.vel.x = 0;
            s.vel.y = 0;
          }
        }
      } else {
        this.pos.x += dx;
        this.pos.y += dy;
        this.vel.x = 0;
        this.vel.y = 0;
      }
    } else if (!this.grouped && !this.isControlNode) {
      // Figuras sueltas flotan libres dentro del escenario
      this.pos.x += this.vel.x;
      this.pos.y += this.vel.y;

      if (this.pos.x < stage.x + 30 || this.pos.x > stage.x + stage.width - 30) this.vel.x *= -1;
      if (this.pos.y < stage.y + 30 || this.pos.y > stage.y + stage.height - 30) this.vel.y *= -1;

      this.pos.x = clamp(this.pos.x, stage.x + 30, stage.x + stage.width - 30);
      this.pos.y = clamp(this.pos.y, stage.y + 30, stage.y + stage.height - 30);
    } else if (this.isControlNode && synergy.superRing.indexOf(this) === -1) {
      // Círculos sueltos (con su grupo detrás) flotan sutilmente
      this.pos.x += this.vel.x;
      this.pos.y += this.vel.y;

      if (this.pos.x < stage.x + 50 || this.pos.x > stage.x + stage.width - 50) this.vel.x *= -1;
      if (this.pos.y < stage.y + 50 || this.pos.y > stage.y + stage.height - 50) this.vel.y *= -1;

      this.pos.x = clamp(this.pos.x, stage.x + 50, stage.x + stage.width - 50);
      this.pos.y = clamp(this.pos.y, stage.y + 50, stage.y + stage.height - 50);
    }
  }

  updatePosition() {
    // Se adhieren magnéticamente al objetivo calculado en drawSynergy
    if ((this.grouped && !this.dragging) || (this.isControlNode && synergy.superRing.includes(this) && !this.dragging)) {
      this.pos.x = lerp(this.pos.x, this.target.x, synergy.snapSpeed);
      this.pos.y = lerp(this.pos.y, this.target.y, synergy.snapSpeed);
    }

    this.currentColor = lerpColorArray(this.currentColor, this.targetColor, 0.1);
    this.angle += 0.005;
  }

  display() {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);

    let pulseScale = 1;
    const c = this.currentColor;

    if (this.grouped || this.isControlNode) {
      pulseScale += synergy.globalGlow * 0.35;
      ctx.strokeStyle = rgba(c, 0.78 + synergy.globalGlow * 0.2);
      ctx.fillStyle = rgba(c, 1);
      ctx.lineWidth = 2.5 + synergy.globalGlow * 3;
    } else {
      ctx.strokeStyle = rgba(c, 0.43);
      ctx.fillStyle = "transparent";
      ctx.lineWidth = 1.5;
    }

    ctx.beginPath();

    if (this.type === 0) {
      const r = this.size * 0.6 * pulseScale;
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    } else if (this.type === 1) {
      const s = this.size * 0.9 * pulseScale;
      ctx.rect(-s / 2, -s / 2, s, s);
    } else {
      const s = this.size * 0.95 * pulseScale;
      ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
    }

    if (this.grouped || this.isControlNode) ctx.fill();
    ctx.stroke();

    if (this.isControlNode) {
      ctx.beginPath();
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.arc(0, 0, this.size * 0.95 * pulseScale * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

class SynergyParticle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = random(-4, 4);
    this.vy = random(-4, 4);
    this.size = random(2.5, 7);
    this.alpha = 1;
    this.color = color;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= 0.02;
  }

  display() {
    ctx.fillStyle = rgba(this.color, this.alpha);
    circle(this.x, this.y, this.size);
  }
}

function initSynergy() {
  synergy.shapes = [];
  synergy.particles = [];
  synergy.dragged = null;
  synergy.globalGlow = 0;
  synergy.nextGroupId = 0;
  synergy.superRing = [];

  const stage = getStage();
  const sx0 = stage.x + 60;
  const sx1 = stage.x + stage.width - 60;
  const sy0 = stage.y + 60;
  const sy1 = stage.y + stage.height - 60;

  // En mobile la cantidad de figuras iniciales se reduce a la mitad
  // (de 8+8 a 4+4) para que no queden amontonadas en un escenario
  // chico. En escritorio se mantienen las 8+8 de siempre.
  const countPerType = W < 768 ? 4 : 8;
  for (let i = 0; i < countPerType; i++) synergy.shapes.push(new SynergyShape(0, random(sx0, sx1), random(sy0, sy1)));
  for (let i = 0; i < countPerType; i++) synergy.shapes.push(new SynergyShape(1, random(sx0, sx1), random(sy0, sy1)));
}

function drawSynergy(frame) {
  drawBaseBackground(synergy.globalGlow);

  const stage = getStage();

  for (const s of synergy.shapes) s.updatePhysics();

  const controlCircles = synergy.shapes.filter((s) => s.isControlNode);

  if (synergy.superRing.length > 1) {
    // Aro mayor: todos los grupos quedan reunidos en el centro del escenario
    synergy.globalGlow = lerp(synergy.globalGlow, 0.85, 0.05);

    const center = vec(stage.x + stage.width / 2, stage.y + stage.height / 2);
    const globalAngle = frame * 0.015;

    // Los círculos de control ya no quedan como un aro de círculos
    // separados: convergen todos exactamente al mismo punto central
    // (mismo tamaño, mismo relleno opaco), así se superponen del todo
    // y se leen como un único círculo en vez de un racimo de varios
    // círculos apenas separados (y de paso viran su color hacia el
    // celeste, la tonalidad de la unión total).
    for (const c of synergy.superRing) {
      c.target.x = center.x;
      c.target.y = center.y;
      c.targetColor = [...synergy.colors.celeste];
    }

    // Todos los grupos que llegan al aro mayor se funden en una sola
    // figura: un único aro exterior que alterna triángulo, cuadrado,
    // triángulo, cuadrado... para que se lea como una sola trama
    // ordenada, en vez de una mezcla enredada.
    const linkedGroupIds = synergy.superRing.map((c) => c.linkedGroupId);
    const allMembers = synergy.shapes.filter((s) => !s.isControlNode && linkedGroupIds.includes(s.groupId));
    const triangleMembers = allMembers.filter((s) => s.type === 0);
    const squareMembers = allMembers.filter((s) => s.type === 1);
    const orderedMembers = [];
    const maxLen = Math.max(triangleMembers.length, squareMembers.length);

    for (let k = 0; k < maxLen; k++) {
      if (squareMembers[k]) orderedMembers.push(squareMembers[k]);
      if (triangleMembers[k]) orderedMembers.push(triangleMembers[k]);
    }

    const outerRadius = 180 + 20 * Math.sin(frame * 0.05);

    orderedMembers.forEach((m, j) => {
      const mAngle = globalAngle * 1.3 + (j * Math.PI * 2) / orderedMembers.length;
      m.target.x = center.x + Math.cos(mAngle) * outerRadius;
      m.target.y = center.y + Math.sin(mAngle) * outerRadius;
    });

    // El conjunto ya fundido es el que "respira": un único pulso
    // grande de luz celeste que nace del centro y se expande, en vez
    // de vínculos individuales entre círculos.
    drawSynergyBigPulse(center, frame);

    if (frame % 4 === 0) {
      synergy.particles.push(new SynergyParticle(center.x + random(-15, 15), center.y + random(-15, 15), synergy.colors.celeste));
    }
  } else {
    synergy.globalGlow = lerp(synergy.globalGlow, 0, 0.08);
  }

  // Grupos que no forman parte del aro mayor: cada uno orbita a su
  // propio círculo de control. Corre siempre (haya o no un aro mayor
  // activo en paralelo), para que un grupo nuevo formado después de
  // la fusión también se mantenga armado en vez de que su círculo se
  // vaya alejando de las figuras que quedaron quietas.
  for (const c of controlCircles) {
    if (synergy.superRing.includes(c)) continue;

    const members = synergy.shapes.filter((s) => s.groupId === c.linkedGroupId && !s.isControlNode);

    members.forEach((m, j) => {
      const mAngle = frame * 0.03 + (j * Math.PI * 2) / members.length;
      m.target.x = c.pos.x + Math.cos(mAngle) * 55;
      m.target.y = c.pos.y + Math.sin(mAngle) * 55;
    });
  }

  // Enlaces visuales de cada grupo hacia su círculo de control
  for (const c of controlCircles) {
    const members = synergy.shapes.filter((s) => s.groupId === c.linkedGroupId && !s.isControlNode);

    if (members.length > 0) {
      // El contorno propio del grupo solo se dibuja mientras el grupo
      // sigue siendo su propio bloque; una vez que se fusiona al aro
      // mayor, todos comparten una sola formación y ese contorno
      // individual dejaría de tener sentido (y se vería como líneas
      // cruzadas sin relación con las posiciones reales).
      if (!synergy.superRing.includes(c)) {
        ctx.save();
        ctx.strokeStyle = rgba(c.targetColor, 0.2 + 0.6 * synergy.globalGlow);
        ctx.lineWidth = 2 + 2 * synergy.globalGlow;
        ctx.beginPath();
        members.forEach((m, i) => {
          if (i === 0) ctx.moveTo(m.pos.x, m.pos.y);
          else ctx.lineTo(m.pos.x, m.pos.y);
        });
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = 1;
      for (const m of members) line(m.pos.x, m.pos.y, c.pos.x, c.pos.y);
      ctx.restore();
    }
  }

  for (const s of synergy.shapes) {
    s.updatePosition();
    s.display();
  }

  for (let i = synergy.particles.length - 1; i >= 0; i--) {
    const p = synergy.particles[i];
    p.update();
    p.display();
    if (p.alpha <= 0) synergy.particles.splice(i, 1);
  }
}

function createSynergyExplosion(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    synergy.particles.push(new SynergyParticle(x, y, color));
  }
}

// Pulso único que emite el conjunto ya fundido: un anillo de luz que
// nace del centro, se expande y se apaga, y se repite — en tonos
// celestes, como el brillo de algo unido respirando junto, en vez de
// las chispas o los vínculos sueltos entre partes separadas.
function drawSynergyBigPulse(center, frame) {
  const [r, g, b] = synergy.colors.celeste;
  const period = 90;
  const phase = (frame % period) / period;
  const maxRadius = 220;
  const radius = 40 + phase * maxRadius;
  const ringAlpha = (1 - phase) * 0.5;

  ctx.save();
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${ringAlpha})`;
  ctx.lineWidth = 1 + 3 * (1 - phase);
  strokeCircle(center.x, center.y, radius * 2);
  ctx.restore();

  const coreSize = 55 + 10 * Math.sin(frame * 0.05);

  ctx.save();
  const glow = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, coreSize);
  glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.55)`);
  glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(center.x, center.y, coreSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Resuelve qué pasa al soltar una figura o un círculo: fusión con otra
// figura del mismo tipo, incorporación a un grupo existente, fusión de
// dos grupos, o unión de dos círculos de control al súper aro.
function resolveSynergyDrop(dragged) {
  if (!dragged) return;

  if (!dragged.isControlNode) {
    let closest = null;
    let minDist = synergy.connectionDist;

    for (const s of synergy.shapes) {
      if (s !== dragged && s.type === dragged.type && !s.isControlNode) {
        const d = dist(dragged.pos.x, dragged.pos.y, s.pos.x, s.pos.y);
        if (d < minDist) {
          minDist = d;
          closest = s;
        }
      }
    }

    if (closest) {
      if (!dragged.grouped && !closest.grouped) {
        // Nace un grupo nuevo de 2 figuras
        const id = synergy.nextGroupId++;
        dragged.grouped = closest.grouped = true;
        dragged.groupId = closest.groupId = id;

        const col = dragged.type === 0 ? synergy.colors.triangle : synergy.colors.square;
        dragged.targetColor = [...col];
        closest.targetColor = [...col];

        // Nace el círculo de control
        const avg = vec((dragged.pos.x + closest.pos.x) / 2, (dragged.pos.y + closest.pos.y) / 2);
        const control = new SynergyShape(2, avg.x, avg.y);
        control.isControlNode = true;
        control.linkedGroupId = id;
        control.targetColor = [...synergy.colors.circle];
        control.vel = randomVec(0.5);
        synergy.shapes.push(control);

        createSynergyExplosion(avg.x, avg.y, synergy.colors.circle, 30);
      } else if (closest.grouped && !dragged.grouped) {
        // La figura suelta se une al grupo existente
        dragged.grouped = true;
        dragged.groupId = closest.groupId;
        dragged.targetColor = [...closest.targetColor];
        createSynergyExplosion(dragged.pos.x, dragged.pos.y, closest.targetColor, 15);
      } else if (dragged.grouped && !closest.grouped) {
        // La figura objetivo se une al grupo de la que arrastramos
        closest.grouped = true;
        closest.groupId = dragged.groupId;
        closest.targetColor = [...dragged.targetColor];
        createSynergyExplosion(closest.pos.x, closest.pos.y, dragged.targetColor, 15);
      } else if (dragged.grouped && closest.grouped && dragged.groupId !== closest.groupId) {
        // Fusión de dos grupos del mismo tipo en uno solo
        const targetId = closest.groupId;
        const oldId = dragged.groupId;

        for (const s of synergy.shapes) {
          if (s.groupId === oldId) s.groupId = targetId;
        }

        for (let i = synergy.shapes.length - 1; i >= 0; i--) {
          const s = synergy.shapes[i];
          if (s.isControlNode && s.linkedGroupId === oldId) {
            const ringIdx = synergy.superRing.indexOf(s);
            if (ringIdx !== -1) synergy.superRing.splice(ringIdx, 1);
            createSynergyExplosion(s.pos.x, s.pos.y, [255, 255, 255], 20);
            synergy.shapes.splice(i, 1);
          }
        }
      }
    }
  } else {
    // Súper aro: juntar círculos de control
    for (const s of synergy.shapes) {
      if (s !== dragged && s.isControlNode) {
        if (dist(dragged.pos.x, dragged.pos.y, s.pos.x, s.pos.y) < synergy.connectionDist * 1.5) {
          if (!synergy.superRing.includes(dragged)) synergy.superRing.push(dragged);
          if (!synergy.superRing.includes(s)) synergy.superRing.push(s);
          createSynergyExplosion(dragged.pos.x, dragged.pos.y, [255, 255, 255], 40);
        }
      }
    }
  }
}

function synergyMousePressed() {
  let minD = 35;
  synergy.dragged = null;

  for (const s of synergy.shapes) {
    const d = dist(pointer.x, pointer.y, s.pos.x, s.pos.y);
    if (d < minD) {
      minD = d;
      synergy.dragged = s;
    }
  }

  if (synergy.dragged) synergy.dragged.dragging = true;
}

function synergyMouseReleased() {
  const dragged = synergy.dragged;

  if (dragged) {
    dragged.dragging = false;
    resolveSynergyDrop(dragged);
  }

  synergy.dragged = null;
}


//------------------------------------
// 2. Empatia - flotacion libre y pulsacion compartida
//------------------------------------
// Adaptado de un sketch de Processing: tres figuras (triangulo,
// cuadrado, circulo) flotan libres por la escena. Cuando dos se
// acercan lo suficiente empiezan a "escucharse" - una linea tenue y
// tembloroza que se va afirmando - hasta quedar vinculadas; una vez
// vinculadas laten al mismo ritmo, se sostienen a una distancia
// comoda entre si y, si se alejan demasiado, el vinculo se rompe.
// Alrededor, un enjambre de figuras de fondo flota por su cuenta y
// respira al mismo pulso que las figuras principales, como eco del
// vinculo central. Cuantos mas vinculos hay activos, mas se ilumina
// el fondo compartido de las 9 experiencias.
const empathy = {
  entities: [],
  bgShapes: [],
  dragged: null,
  syncProgress: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
  isLinked: [[false, false, false], [false, false, false], [false, false, false]],
  globalGlow: 0,
  colors: {
    triangle: [0, 245, 212],
    square: [4, 139, 133],
    circle: [72, 202, 228]
  }
};

class EmpathyEntity {
  constructor(type, x, y, color, size, freq) {
    this.type = type; // 0: triangulo, 1: cuadrado, 2: circulo
    this.pos = vec(x, y);
    this.vel = randomVec(random(0.1, 0.3));
    this.color = color;
    this.size = size;

    this.baseFreq = freq;
    this.currentFreq = freq;
    this.phase = random(0, Math.PI * 2);
    this.angle = 0;
  }

  updatePhysics() {
    const stage = getStage();
    const margin = Math.max(40, this.size);

    if (empathy.dragged === this) {
      this.pos.x = lerp(this.pos.x, pointer.x, 0.2);
      this.pos.y = lerp(this.pos.y, pointer.y, 0.2);
      this.vel.x = 0;
      this.vel.y = 0;
    } else {
      this.pos.x += this.vel.x;
      this.pos.y += this.vel.y;
      this.vel.x *= 0.96;
      this.vel.y *= 0.96;

      if (Math.hypot(this.vel.x, this.vel.y) < 0.2) {
        const impulse = randomVec(0.02);
        this.vel.x += impulse.x;
        this.vel.y += impulse.y;
      }

      if (this.pos.x < stage.x + margin || this.pos.x > stage.x + stage.width - margin) this.vel.x *= -1;
      if (this.pos.y < stage.y + margin || this.pos.y > stage.y + stage.height - margin) this.vel.y *= -1;

      this.pos.x = clamp(this.pos.x, stage.x + margin, stage.x + stage.width - margin);
      this.pos.y = clamp(this.pos.y, stage.y + margin, stage.y + stage.height - margin);
    }

    this.angle += 0.005;
  }

  display(index) {
    ctx.save();

    // Tiembla un poco mientras "escucha" a otra figura sin llegar a vincularse
    let maxFriction = 0;
    for (let j = 0; j < 3; j++) {
      if (j !== index && !empathy.isLinked[index][j] && empathy.syncProgress[index][j] > 0) {
        maxFriction = Math.max(maxFriction, 1 - empathy.syncProgress[index][j]);
      }
    }
    const shake = maxFriction;

    ctx.translate(this.pos.x + random(-shake, shake), this.pos.y + random(-shake, shake));
    ctx.rotate(this.angle);

    const currentSize = this.size + Math.sin(this.phase) * (this.size * 0.3);
    const isUnited = empathy.isLinked[index][0] || empathy.isLinked[index][1] || empathy.isLinked[index][2];

    if (isUnited) {
      ctx.fillStyle = rgba(this.color, 0.24);
      drawEmpathyEntityShape(this.type, currentSize * 1.6, currentSize * 2.2, currentSize * 1.2);
    }

    ctx.fillStyle = rgba(this.color, 1);
    drawEmpathyEntityShape(this.type, currentSize, currentSize * 1.5, currentSize * 0.8);

    ctx.restore();
  }
}

// Dibuja, ya trasladado al origen de la figura, el triangulo (radio
// triR), el cuadrado (lado sqSide) o el circulo (diametro circD)
// segun el tipo, y lo rellena con el fillStyle ya seteado por quien
// llama.
function drawEmpathyEntityShape(type, triR, sqSide, circD) {
  if (type === 0) {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
      const x = Math.cos(a) * triR;
      const y = Math.sin(a) * triR;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  } else if (type === 1) {
    rectCenter(0, 0, sqSide, sqSide);
  } else {
    circle(0, 0, circD);
  }
}

// Logica de escucha, vinculo y ruptura entre cada par de figuras:
// se acercan -> tiemblan y se van sincronizando -> se vinculan y
// laten juntas a una distancia comoda -> si se alejan demasiado, el
// vinculo se rompe y vuelven a flotar libres.
function updateEmpathyLinks() {
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      const e1 = empathy.entities[i];
      const e2 = empathy.entities[j];
      const d = dist(e1.pos.x, e1.pos.y, e2.pos.x, e2.pos.y);

      if (empathy.isLinked[i][j]) {
        if (d > 210) {
          empathy.isLinked[i][j] = false;
          empathy.isLinked[j][i] = false;
          empathy.syncProgress[i][j] = 0;
          empathy.syncProgress[j][i] = 0;
        } else {
          const pulseLine = map(Math.sin(e1.phase), -1, 1, 1, 3);
          ctx.strokeStyle = rgba(lerpColorArray(e1.color, e2.color, 0.5), 0.78);
          ctx.lineWidth = pulseLine;
          line(e1.pos.x, e1.pos.y, e2.pos.x, e2.pos.y);

          const pull = sub(e2.pos, e1.pos);
          const pullDist = Math.hypot(pull.x, pull.y);
          const dir = normalize(pull);
          const force = (pullDist - 130) * 0.0005;

          e1.vel.x += dir.x * force;
          e1.vel.y += dir.y * force;
          e2.vel.x -= dir.x * force;
          e2.vel.y -= dir.y * force;

          const tangentX = -dir.y * 0.0015;
          const tangentY = dir.x * 0.0015;
          e1.vel.x += tangentX;
          e1.vel.y += tangentY;
          e2.vel.x -= tangentX;
          e2.vel.y -= tangentY;
        }
      } else if (d < 140) {
        empathy.syncProgress[i][j] += 0.003;
        empathy.syncProgress[j][i] = empathy.syncProgress[i][j];

        const shake = (1 - empathy.syncProgress[i][j]) * 1.5;
        ctx.strokeStyle = rgba(lerpColorArray(e1.color, e2.color, 0.5), 0.47 * empathy.syncProgress[i][j]);
        ctx.lineWidth = 1;
        line(
          e1.pos.x + random(-shake, shake), e1.pos.y + random(-shake, shake),
          e2.pos.x + random(-shake, shake), e2.pos.y + random(-shake, shake)
        );

        if (empathy.syncProgress[i][j] >= 1) {
          empathy.isLinked[i][j] = true;
          empathy.isLinked[j][i] = true;
        }
      } else if (empathy.syncProgress[i][j] > 0) {
        empathy.syncProgress[i][j] -= 0.005;
        empathy.syncProgress[j][i] = empathy.syncProgress[i][j];
      }
    }
  }
}

// Agrupa las figuras vinculadas (componentes conectados) y sincroniza
// la frecuencia de latido dentro de cada grupo: una figura "lidera"
// el ritmo y el resto copia su fase.
function updateEmpathyGroupFrequencies() {
  const root = [0, 1, 2];

  if (empathy.isLinked[0][1]) {
    const r0 = root[0];
    const r1 = root[1];
    for (let k = 0; k < 3; k++) if (root[k] === r1) root[k] = r0;
  }
  if (empathy.isLinked[1][2]) {
    const r1 = root[1];
    const r2 = root[2];
    for (let k = 0; k < 3; k++) if (root[k] === r2) root[k] = r1;
  }
  if (empathy.isLinked[0][2]) {
    const r0 = root[0];
    const r2 = root[2];
    for (let k = 0; k < 3; k++) if (root[k] === r2) root[k] = r0;
  }

  const sumF = [0, 0, 0];
  const countF = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    sumF[root[i]] += empathy.entities[i].baseFreq;
    countF[root[i]]++;
  }

  for (let i = 0; i < 3; i++) {
    const e = empathy.entities[i];
    const r = root[i];
    const avgF = sumF[r] / countF[r];
    e.currentFreq = lerp(e.currentFreq, avgF, 0.05);

    let leader = i;
    for (let k = 0; k < 3; k++) {
      if (root[k] === r) {
        leader = k;
        break;
      }
    }

    if (i === leader) {
      e.phase += e.currentFreq;
    } else {
      e.phase = empathy.entities[leader].phase;
    }
  }
}

// Figuras de fondo: flotan libres por todo el escenario y laten al
// mismo ritmo que la figura principal 0, como eco del vinculo central.
class EmpathyBgShape {
  constructor(stage) {
    this.pos = vec(random(stage.x, stage.x + stage.width), random(stage.y, stage.y + stage.height));
    this.vel = randomVec(random(0.1, 0.4));
    this.type = Math.floor(random(0, 3));
    this.size = random(15, 30);
    this.angle = random(0, Math.PI * 2);
    this.rotSpeed = random(-0.005, 0.005);
    this.color = empathy.colors.circle;
  }

  update(stage) {
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    this.vel.x *= 0.99;
    this.vel.y *= 0.99;

    const speed = Math.hypot(this.vel.x, this.vel.y);
    if (speed < 0.2) {
      const impulse = randomVec(0.05);
      this.vel.x += impulse.x;
      this.vel.y += impulse.y;
    }

    const limit = 0.5;
    const speed2 = Math.hypot(this.vel.x, this.vel.y);
    if (speed2 > limit) {
      this.vel.x = (this.vel.x / speed2) * limit;
      this.vel.y = (this.vel.y / speed2) * limit;
    }

    this.angle += this.rotSpeed;

    // Pantalla infinita: reaparece del otro lado del escenario.
    if (this.pos.x < stage.x - 30) this.pos.x = stage.x + stage.width + 30;
    if (this.pos.x > stage.x + stage.width + 30) this.pos.x = stage.x - 30;
    if (this.pos.y < stage.y - 30) this.pos.y = stage.y + stage.height + 30;
    if (this.pos.y > stage.y + stage.height + 30) this.pos.y = stage.y - 30;
  }

  display(globalPhase) {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);

    const currentSize = this.size + Math.sin(globalPhase) * (this.size * 0.2);
    const alpha = (25 + Math.sin(globalPhase) * 15) / 255;

    ctx.strokeStyle = rgba(this.color, alpha);
    ctx.lineWidth = 1;

    if (this.type === 0) {
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
        const x = Math.cos(a) * currentSize;
        const y = Math.sin(a) * currentSize;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    } else if (this.type === 1) {
      rectCenterStroke(0, 0, currentSize * 1.2, currentSize * 1.2);
    } else {
      strokeCircle(0, 0, currentSize * 1.3);
    }

    ctx.restore();
  }
}

function initEmpathy() {
  const stage = getStage();

  // En mobile las 3 figuras principales son un poco mas chicas y
  // arrancan mas separadas entre si (mas cerca de las esquinas del
  // escenario), ya que en una pantalla chica y cuadrada quedaban muy
  // pegoteadas. En escritorio no se toca nada.
  const isMobile = W < 768;
  const sizeScale = isMobile ? 0.8 : 1;
  const posA = isMobile ? 0.18 : 0.28;
  const posB = isMobile ? 0.82 : 0.72;
  const posTopY = isMobile ? 0.28 : 0.36;
  const posBottomY = isMobile ? 0.82 : 0.74;

  empathy.entities = [
    new EmpathyEntity(0, stage.x + stage.width * posA, stage.y + stage.height * posTopY, empathy.colors.triangle, 22 * sizeScale, 0.08),
    new EmpathyEntity(1, stage.x + stage.width * posB, stage.y + stage.height * posTopY, empathy.colors.square, 28 * sizeScale, 0.02),
    new EmpathyEntity(2, stage.x + stage.width * 0.5, stage.y + stage.height * posBottomY, empathy.colors.circle, 24 * sizeScale, 0.04)
  ];

  // En mobile tambien se reduce la cantidad de figuras de fondo
  // (de 15 a 8) para que el escenario chico no se vea saturado.
  empathy.bgShapes = [];
  const bgCount = isMobile ? 8 : 15;
  for (let i = 0; i < bgCount; i++) empathy.bgShapes.push(new EmpathyBgShape(stage));

  empathy.dragged = null;
  empathy.globalGlow = 0;
  empathy.syncProgress = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  empathy.isLinked = [[false, false, false], [false, false, false], [false, false, false]];
}

function drawEmpathy() {
  const stage = getStage();

  let linkCount = 0;
  if (empathy.isLinked[0][1]) linkCount++;
  if (empathy.isLinked[1][2]) linkCount++;
  if (empathy.isLinked[0][2]) linkCount++;

  empathy.globalGlow = lerp(empathy.globalGlow, linkCount / 3, 0.05);
  drawBaseBackground(empathy.globalGlow);

  // La figura 0 marca el pulso de referencia para el fondo atmosferico.
  const globalPhase = empathy.entities[0].phase;

  for (const bg of empathy.bgShapes) {
    bg.update(stage);
    bg.display(globalPhase);
  }

  updateEmpathyLinks();
  updateEmpathyGroupFrequencies();

  for (let i = 0; i < empathy.entities.length; i++) {
    const e = empathy.entities[i];
    e.updatePhysics();
    e.display(i);
  }
}

function empathyMousePressed(x, y) {
  for (const e of empathy.entities) {
    if (dist(x, y, e.pos.x, e.pos.y) < Math.max(35, e.size)) {
      empathy.dragged = e;
      break;
    }
  }
}

function empathyMouseReleased() {
  empathy.dragged = null;
}

//------------------------------------
// 3. Identidad: Reafirmacion (Mayoria >= 3, Brillo al Reafirmar, Sin Texto)
//------------------------------------
const identity = {
  shapes: [],
  current: 0, // 0 = triangulo, 1 = cuadrado, 2 = circulo
  masked: false,
  maskTimer: 0,
  maskDuration: 5000,
  cooldownTimer: -Infinity,
  cooldownDuration: 1500,
  pulseScale: 1,
  dragged: null,
  reaffirmGlow: 0, // brillo del fondo que destella al reafirmarse el triangulo
  centralGlow: 0, // halo/blur propio de la figura central al cambiar de identidad
  colors: {
    triangle: [4, 139, 133],  // Teal oscuro / esmeralda
    square: [0, 245, 212],    // Menta brillante / cian vivo
    circle: [72, 202, 228]    // Cian suave
  }
};

class IdentityShape {
  constructor(type, x, y) {
    this.type = type; // 1 = cuadrado, 2 = circulo
    this.pos = vec(x, y);
    this.vel = randomVec(random(0.5, 1.5));
    this.size = 28;
    this.angle = 0;
    this.dragging = false;
    this.glow = 0; // 0..1: cuanto se ilumina al entrar a la zona de interaccion central
  }

  update(stage, cx, cy, influenceRadius) {
    if (this.dragging) {
      this.pos.x = pointer.x;
      this.pos.y = pointer.y;
      this.vel.x = 0;
      this.vel.y = 0;
    } else {
      this.pos.x += this.vel.x;
      this.pos.y += this.vel.y;
      this.vel.x *= 0.92;
      this.vel.y *= 0.92;

      // Flotacion aleatoria suave
      if (Math.hypot(this.vel.x, this.vel.y) < 0.5) {
        const g = randomVec(0.2);
        this.vel.x += g.x;
        this.vel.y += g.y;
      }

      // Rebote en los bordes del escenario
      const left = stage.x + 30;
      const right = stage.x + stage.width - 30;
      const top = stage.y + 30;
      const bottom = stage.y + stage.height - 30;

      if (this.pos.x < left) {
        this.pos.x = left;
        this.vel.x *= -1;
      }
      if (this.pos.x > right) {
        this.pos.x = right;
        this.vel.x *= -1;
      }
      if (this.pos.y < top) {
        this.pos.y = top;
        this.vel.y *= -1;
      }
      if (this.pos.y > bottom) {
        this.pos.y = bottom;
        this.vel.y *= -1;
      }

      // Escudo invisible: evita que entren solas flotando
      const d = dist(this.pos.x, this.pos.y, cx, cy);
      if (d > influenceRadius && d < influenceRadius + 25) {
        const repel = normalize(sub(this.pos, vec(cx, cy)));
        this.vel.x += repel.x * 1.5;
        this.vel.y += repel.y * 1.5;
      }
    }

    this.angle += this.type === 1 ? 0.02 : 0.01;

    // Cuanto mas cerca del centro (dentro de la zona de interaccion),
    // mas se ilumina la figura; afuera, el brillo se apaga suave.
    const dCenter = dist(this.pos.x, this.pos.y, cx, cy);
    const targetGlow = dCenter < influenceRadius ? 1 : 0;
    this.glow = lerp(this.glow, targetGlow, 0.08);
  }

  display() {
    const col = this.type === 1 ? identity.colors.square : identity.colors.circle;

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);

    if (this.glow > 0.02) {
      // Halo difuso del color propio de la figura, mas fuerte cuanto
      // mas metida esta en la zona de interaccion del centro.
      ctx.shadowColor = rgba(col, Math.min(1, this.glow) * 0.9);
      ctx.shadowBlur = 22 * this.glow;
    }

    ctx.fillStyle = rgba(col, 1);

    if (this.type === 1) {
      rectCenter(0, 0, this.size, this.size);
    } else {
      circle(0, 0, this.size * 1.15);
    }

    ctx.restore();
  }
}

function initRupture() {
  identity.shapes = [];
  identity.current = 0;
  identity.masked = false;
  identity.maskTimer = 0;
  identity.cooldownTimer = -Infinity;
  identity.pulseScale = 1;
  identity.dragged = null;
  identity.reaffirmGlow = 0;
  identity.centralGlow = 0;

  const stage = getStage();

  // 3 cuadrados arriba y 3 circulos abajo, flotando fuera del centro
  for (let i = 0; i < 3; i++) {
    identity.shapes.push(
      new IdentityShape(
        1,
        random(stage.x + 30, stage.x + stage.width - 30),
        random(stage.y + 30, stage.y + stage.height * 0.28)
      )
    );
    identity.shapes.push(
      new IdentityShape(
        2,
        random(stage.x + 30, stage.x + stage.width - 30),
        random(stage.y + stage.height * 0.72, stage.y + stage.height - 30)
      )
    );
  }
}

// Dibuja la silueta (triangulo/cuadrado/circulo) del tamaño pedido
// usando el fillStyle ya seteado por quien llama.
function fillIdentityGlyph(type, size) {
  if (type === 0) {
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.866, size * 0.5);
    ctx.lineTo(-size * 0.866, size * 0.5);
    ctx.closePath();
    ctx.fill();
  } else if (type === 1) {
    rectCenter(0, 0, size * 1.7, size * 1.7);
  } else {
    circle(0, 0, size * 1.9);
  }
}

// Zona de influencia: contorno circular (sin relleno, linea muy fina).
function drawIdentityZone(cx, cy, radius) {
  ctx.strokeStyle = "rgba(0, 255, 255, 0.2)";
  ctx.lineWidth = 0.2;
  strokeCircle(cx, cy, radius * 2);
}

function drawRupture(frame, now) {
  const stage = getStage();
  const cx = stage.x + stage.width / 2;
  const cy = stage.y + stage.height / 2;
  const minSide = Math.min(stage.width, stage.height);
  const R = minSide * 0.115;
  const influenceRadius = minSide * 0.28;

  // El brillo del fondo se desvanece suavemente y solo destella
  // al momento exacto de la reafirmacion.
  identity.reaffirmGlow = lerp(identity.reaffirmGlow, 0, 0.04);
  drawBaseBackground(identity.reaffirmGlow);

  // Zona de influencia (contorno circular, sin relleno)
  drawIdentityZone(cx, cy, influenceRadius);

  // Analizar la presion externa
  let countSq = 0;
  let countCir = 0;

  for (const s of identity.shapes) {
    if (dist(s.pos.x, s.pos.y, cx, cy) < influenceRadius) {
      if (s.type === 1) countSq++;
      else countCir++;
    }
  }

  const totalInside = countSq + countCir;

  // Logica de cambio por mayoria (requiere al menos 3 figuras en total)
  if (!identity.masked) {
    // Solo puede cambiar si no esta en tiempo de inmunidad
    if (now - identity.cooldownTimer > identity.cooldownDuration) {
      if (totalInside >= 3) {
        if (countSq > countCir) {
          identity.current = 1; // Se vuelve cuadrado
          identity.masked = true;
          identity.maskTimer = now;
          identity.pulseScale = 1.4;
          identity.centralGlow = 1;
        } else if (countCir > countSq) {
          identity.current = 2; // Se vuelve circulo
          identity.masked = true;
          identity.maskTimer = now;
          identity.pulseScale = 1.4;
          identity.centralGlow = 1;
        }
      }
    }
  } else {
    // Si tiene identidad falsa, cuenta el tiempo de mascara
    if (now - identity.maskTimer >= identity.maskDuration) {
      // Reafirmacion: vuelve a ser triangulo
      identity.current = 0;
      identity.masked = false;
      identity.pulseScale = 1.8;
      identity.reaffirmGlow = 1; // el fondo brilla unicamente cuando el triangulo se reafirma
      identity.centralGlow = 1;

      // Activar inmunidad para evitar bugs de re-transformacion
      identity.cooldownTimer = now;

      // Expulsar a las figuras que estan cerca del centro
      for (const s of identity.shapes) {
        const d = dist(s.pos.x, s.pos.y, cx, cy);
        if (d < influenceRadius + 50) {
          let push = sub(s.pos, vec(cx, cy));
          if (Math.hypot(push.x, push.y) === 0) push = randomVec(1);
          push = normalize(push);
          s.vel.x += push.x * 28;
          s.vel.y += push.y * 28;
        }
      }
    }
  }

  // Suavizar el latido (vuelve a escala 1.0)
  identity.pulseScale = lerp(identity.pulseScale, 1, 0.1);
  // El halo de la figura central se apaga solo, mas lento que el
  // destello de fondo, para que se note como una respuesta breve
  // al momento del cambio.
  identity.centralGlow = lerp(identity.centralGlow, 0, 0.03);

  // Dibujar la identidad central
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(identity.pulseScale, identity.pulseScale);

  const currentColor =
    identity.current === 1
      ? identity.colors.square
      : identity.current === 2
      ? identity.colors.circle
      : identity.colors.triangle;

  if (identity.centralGlow > 0.02) {
    // Respuesta visual al cambio: la figura central se ilumina con
    // un blur de su propio color, igual que las figuras externas.
    ctx.shadowColor = rgba(currentColor, Math.min(1, identity.centralGlow));
    ctx.shadowBlur = 45 * identity.centralGlow;
  }

  ctx.fillStyle = rgba(currentColor, 1);
  fillIdentityGlyph(identity.current, R);

  // El detalle interno no lleva el halo, para que no se vea doble.
  ctx.shadowBlur = 0;

  // Detalle poetico: el "corazon" interno triangular
  const innerPulse = 1 + 0.15 * Math.sin(frame * 0.1);
  ctx.scale(0.25 * innerPulse, 0.25 * innerPulse);
  ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
  ctx.beginPath();
  ctx.moveTo(0, -R);
  ctx.lineTo(R * 0.866, R * 0.5);
  ctx.lineTo(-R * 0.866, R * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Actualizar y dibujar las figuras externas
  for (const s of identity.shapes) {
    s.update(stage, cx, cy, influenceRadius);
    s.display();
  }
}

function ruptureMousePressed(x, y) {
  let minDist = 35;
  identity.dragged = null;

  for (const s of identity.shapes) {
    const d = dist(x, y, s.pos.x, s.pos.y);
    if (d < minDist) {
      minDist = d;
      identity.dragged = s;
    }
  }

  if (identity.dragged) identity.dragged.dragging = true;
}

function ruptureMouseReleased() {
  if (identity.dragged) identity.dragged.dragging = false;
  identity.dragged = null;
}

//------------------------------------
// Loop
//------------------------------------
initSynergy();
initEmpathy();
initRupture();

//------------------------------------
// Entrada directa por parámetro de URL (?estado=)
//------------------------------------
const urlParams = new URLSearchParams(window.location.search);
const estadoInicial = urlParams.get("estado");

if (works.includes(estadoInicial)) {
  currentWork = estadoInicial;
}

//------------------------------------
// Modo miniatura (?mini=1)
// Oculta los botones y simula la interacción
// llamando a las mismas funciones que usa un
// click/touch real (empathyMousePressed/Released, ruptureMousePressed),
// solo que disparadas por un timer en vez de la mano.
//------------------------------------
const isMini = urlParams.get("mini") === "1";

if (isMini) {
  // El ritmo de los clicks simulados se ajusta desde mini-sim-config.js
  // (window.MINI_SIM_CONFIG.click), no acá.
  const clickCfg = (window.MINI_SIM_CONFIG && window.MINI_SIM_CONFIG.click) || {};
  const clickIntervalMin = clickCfg.intervalMin ?? 5000;
  const clickIntervalMax = clickCfg.intervalMax ?? 6000;

  // Colaboracion: como ahora la unión depende de arrastrar una figura
  // hasta otra, acá simulamos ese "arrastre y suelte" moviendo una
  // figura junto a otra compatible y disparando la misma lógica que
  // usa el mouseup real (resolveSynergyDrop), en vez de animarla sola.
  function scheduleSynergyMerge() {
    const wait = random(clickIntervalMin, clickIntervalMax);

    setTimeout(() => {
      if (currentWork === "sinergias") simulateSynergyStep();
      scheduleSynergyMerge();
    }, wait);
  }

  function simulateSynergyStep() {
    // Prioridad 1: unir dos figuras sueltas del mismo tipo
    const loose = synergy.shapes.filter((s) => !s.isControlNode && !s.grouped);

    if (loose.length >= 2) {
      const a = randomFrom(loose);
      const candidates = loose.filter((s) => s !== a && s.type === a.type);

      if (candidates.length > 0) {
        const b = randomFrom(candidates);
        a.pos.x = b.pos.x + random(-40, 40);
        a.pos.y = b.pos.y + random(-40, 40);
        resolveSynergyDrop(a);
        return;
      }
    }

    // Prioridad 2: sumar una figura suelta a un grupo ya formado
    const controlNodes = synergy.shapes.filter((s) => s.isControlNode);

    if (controlNodes.length > 0 && loose.length > 0) {
      const target = randomFrom(controlNodes);
      const groupTypes = new Set(synergy.shapes.filter((s) => s.groupId === target.linkedGroupId && !s.isControlNode).map((s) => s.type));
      const matching = loose.filter((s) => groupTypes.has(s.type));

      if (matching.length > 0) {
        const a = randomFrom(matching);
        a.pos.x = target.pos.x + random(-30, 30);
        a.pos.y = target.pos.y + random(-30, 30);
        resolveSynergyDrop(a);
        return;
      }
    }

    // Prioridad 3: con al menos dos círculos de control sueltos, armar el súper aro
    const freeCircles = controlNodes.filter((c) => !synergy.superRing.includes(c));

    if (freeCircles.length >= 2) {
      const a = randomFrom(freeCircles);
      const b = randomFrom(freeCircles.filter((c) => c !== a));
      a.pos.x = b.pos.x + random(-20, 20);
      a.pos.y = b.pos.y + random(-20, 20);
      resolveSynergyDrop(a);
    }
  }

  scheduleSynergyMerge();

  // Empatia: cada tanto empuja dos figuras a acercarse (para que se
  // vinculen) o, si ya estan vinculadas, a separarse (para mostrar
  // tambien la ruptura), como si alguien las guiara una hacia la
  // otra en vez de dejarlas solo a la deriva.
  function scheduleEmpathyCycle() {
    const wait = random(clickIntervalMin, clickIntervalMax);

    setTimeout(() => {
      if (currentWork === "ramas" && empathy.entities.length === 3) {
        const i = Math.floor(random(0, 3));
        let j = Math.floor(random(0, 3));
        while (j === i) j = Math.floor(random(0, 3));

        const a = empathy.entities[i];
        const b = empathy.entities[j];
        const dir = normalize(sub(b.pos, a.pos));
        const push = empathy.isLinked[i][j] && Math.random() < 0.4 ? -2.2 : 2.2;

        a.vel.x += dir.x * push;
        a.vel.y += dir.y * push;
        b.vel.x -= dir.x * push;
        b.vel.y -= dir.y * push;
      }

      scheduleEmpathyCycle();
    }, wait);
  }

  scheduleEmpathyCycle();

  // Identidad: cada tanto sopla un "viento" suave que acerca al
  // centro un grupo de figuras del mismo tipo, para que la miniatura
  // muestre la reafirmación sin depender del azar de la flotación
  // libre (mismo ritmo configurable que el resto de los clicks).
  function scheduleIdentityGust() {
    const wait = random(clickIntervalMin, clickIntervalMax);

    setTimeout(() => {
      if (currentWork === "ruptura" && !identity.masked) {
        const stage = getStage();
        const cx = stage.x + stage.width / 2;
        const cy = stage.y + stage.height / 2;
        const type = Math.random() < 0.5 ? 1 : 2;
        const candidates = identity.shapes.filter((s) => s.type === type && !s.dragging);

        shuffle(candidates);

        for (const s of candidates.slice(0, 5)) {
          const dir = normalize(sub(vec(cx, cy), s.pos));
          s.vel.x += dir.x * 2.2;
          s.vel.y += dir.y * 2.2;
        }
      }

      scheduleIdentityGust();
    }, wait);
  }

  scheduleIdentityGust();
}

let frame = 0;

function animate(now = performance.now()) {
  requestAnimationFrame(animate);
  frame++;

  if (currentWork === "sinergias") drawSynergy(frame);
  if (currentWork === "ramas") drawEmpathy();
  if (currentWork === "ruptura") drawRupture(frame, now);

  drawStageFrame();
  if (!isMini) drawButtons();
}

animate();

//------------------------------------
// Utilidades
//------------------------------------
function vec(x, y) {
  return { x, y };
}

function clone(v) {
  return { x: v.x, y: v.y };
}

function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

function mult(v, n) {
  return { x: v.x * n, y: v.y * n };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function normalize(v) {
  const m = Math.hypot(v.x, v.y);
  if (m === 0) return { x: 0, y: 0 };
  return { x: v.x / m, y: v.y / m };
}

function randomVec(length) {
  const a = random(0, Math.PI * 2);
  return { x: Math.cos(a) * length, y: Math.sin(a) * length };
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function map(n, a, b, c, d) {
  return c + ((n - a) / (b - a)) * (d - c);
}

function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function lerpColorArray(a, b, t) {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t)
  ];
}

function lerpRgb(a, b, t) {
  const c = lerpColorArray(a, b, t);
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function rgba(c, a) {
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${clamp(a, 0, 1)})`;
}

function hsbToRgb(h, s, v) {
  s /= 100;
  v /= 100;

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ];
}

function line(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function circle(x, y, size) {
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fill();
}

function strokeCircle(x, y, size) {
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.stroke();
}

function rectCenter(x, y, w, h) {
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
}

function rectCenterStroke(x, y, w, h) {
  ctx.strokeRect(x - w / 2, y - h / 2, w, h);
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

function drawElectricArc(a, b, intensity) {
  ctx.strokeStyle = `rgba(255,255,255,${0.45 * intensity})`;
  ctx.lineWidth = 2.5 * intensity;

  const steps = 10;
  let prev = clone(a);

  for (let k = 1; k <= steps; k++) {
    const t = k / steps;
    const p = vec(lerp(a.x, b.x, t), lerp(a.y, b.y, t));

    if (k < steps) {
      p.x += random(-12, 12) * intensity;
      p.y += random(-12, 12) * intensity;
    }

    line(prev.x, prev.y, p.x, p.y);
    prev = p;
  }
}