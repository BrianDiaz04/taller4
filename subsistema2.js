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
  if (currentWork === "ramas") branchesTouch(pointer.x, pointer.y);
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
    if (currentWork === "ramas") branchesTouch(pointer.x, pointer.y);
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

    ctx.fillStyle = active ? "rgba(255, 183, 178, 0.24)" : "rgba(8, 7, 14, 0.78)";
    ctx.strokeStyle = active ? "rgba(255, 220, 210, 0.72)" : "rgba(255, 220, 210, 0.24)";
    ctx.lineWidth = 1;

    roundedRect(b.x, b.y, b.w, b.h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = active ? "rgba(255, 235, 225, 0.96)" : "rgba(225, 205, 205, 0.68)";
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
  }

  ctx.restore();
}

function drawBaseBackground(glow = 0) {
  ctx.fillStyle = lerpRgb([5, 4, 9], [22, 15, 38], glow);
  ctx.fillRect(0, 0, W, H);
}

//------------------------------------
// "Escenario" (zona con margen donde
// pasa todo el contenido interactivo),
// igual que subsistema.js (drawFrame)
// y script.js (getStage/drawStageFrame).
//------------------------------------
function getStage() {
  const isMobile = W < 768;
  const margin = isMobile ? 20 : 40;
  const top = isMobile ? 64 : 76;
  const bottom = isMobile ? 20 : 40;

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
// 1. Sinergias Colectivas
//------------------------------------
const synergy = {
  shapes: [],
  particles: [],
  dragged: null,
  connectionDist: 100,
  snapSpeed: 0.15,
  globalGlow: 0,
  nextGroupId: 0,
  colors: {
    triangle: [255, 183, 178],
    square: [199, 206, 234],
    circle: [175, 228, 222],
    idle: [100, 105, 115]
  }
};

class SynergyShape {
  constructor(type, x, y) {
    this.type = type;
    this.pos = vec(x, y);
    this.target = vec(x, y);
    this.vel = randomVec(random(0.2, 0.6));
    this.groupId = -1;
    this.size = 30;
    this.angle = random(0, Math.PI * 2);
    this.seed = random(0, 1000);
    this.dragging = false;
    this.grouped = false;
    this.currentColor = [...synergy.colors.idle];
    this.targetColor = [...synergy.colors.idle];
  }

  resetGroupState() {
    if (this.groupId < 0) {
      this.grouped = false;
      this.targetColor = [...synergy.colors.idle];
    } else {
      this.grouped = true;
      if (this.type === 0) this.targetColor = [...synergy.colors.triangle];
      if (this.type === 1) this.targetColor = [...synergy.colors.square];
      if (this.type === 2) this.targetColor = [...synergy.colors.circle];
    }
  }

  updatePhysics(frame) {
    if (this.dragging) {
      if (this.groupId >= 0) {
        const dx = pointer.x - pointer.px;
        const dy = pointer.y - pointer.py;

        for (const s of synergy.shapes) {
          if (s.groupId === this.groupId) {
            s.pos.x += dx;
            s.pos.y += dy;
            s.vel.x = 0;
            s.vel.y = 0;
          }
        }
      } else {
        this.pos.x = lerp(this.pos.x, pointer.x, 0.35);
        this.pos.y = lerp(this.pos.y, pointer.y, 0.35);
        this.vel.x = 0;
        this.vel.y = 0;
      }
    } else if (!this.grouped) {
      const stage = getStage();
      const left = stage.x + 20;
      const right = stage.x + stage.width - 20;
      const top = stage.y + 15;
      const bottom = stage.y + stage.height - 20;

      this.pos.x += this.vel.x + Math.sin(frame * 0.015 + this.seed) * 0.15;
      this.pos.y += this.vel.y + Math.cos(frame * 0.015 + this.seed) * 0.15;

      if (this.pos.x < left || this.pos.x > right) this.vel.x *= -1;
      if (this.pos.y < top || this.pos.y > bottom) this.vel.y *= -1;

      this.pos.x = clamp(this.pos.x, stage.x, stage.x + stage.width);
      this.pos.y = clamp(this.pos.y, stage.y, stage.y + stage.height);
    }
  }

  updatePosition() {
    if (this.grouped && !this.dragging) {
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

    const pulseScale = this.grouped ? 1 + synergy.globalGlow * 0.35 : 1;
    const c = this.currentColor;

    if (this.grouped) {
      ctx.strokeStyle = rgba(c, 0.78 + synergy.globalGlow * 0.2);
      ctx.fillStyle = rgba(c, 0.12 + synergy.globalGlow * 0.36);
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

    if (this.grouped) ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

class SynergyParticle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = random(-3, 3);
    this.vy = random(-3, 3);
    this.size = random(2.5, 6);
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

  const stage = getStage();
  const sx0 = stage.x + 60;
  const sx1 = stage.x + stage.width - 60;
  const sy0 = stage.y + 60;
  const sy1 = stage.y + stage.height - 60;

  for (let i = 0; i < 8; i++) synergy.shapes.push(new SynergyShape(0, random(sx0, sx1), random(sy0, sy1)));
  for (let i = 0; i < 6; i++) synergy.shapes.push(new SynergyShape(1, random(sx0, sx1), random(sy0, sy1)));
  for (let i = 0; i < 4; i++) synergy.shapes.push(new SynergyShape(2, random(sx0, sx1), random(sy0, sy1)));
}

function drawSynergy(frame) {
  drawBaseBackground(synergy.globalGlow);

  for (const s of synergy.shapes) s.updatePhysics(frame);

  const clusters = findSynergyClusters();

  for (const s of synergy.shapes) s.resetGroupState();

  const activeCentroids = [];

  for (const cluster of clusters) {
    let triangles = 0;
    let squares = 0;
    let circles = 0;
    const centroid = vec(0, 0);

    for (const s of cluster) {
      centroid.x += s.pos.x;
      centroid.y += s.pos.y;
      if (s.type === 0) triangles++;
      if (s.type === 1) squares++;
      if (s.type === 2) circles++;
    }

    centroid.x /= cluster.length;
    centroid.y /= cluster.length;

    if (triangles === 4 && cluster.length === 4) {
      activeCentroids.push(centroid);
      lockSynergyGroup(cluster, centroid, "triangle", frame);
    } else if (squares === 2 && circles === 1 && cluster.length === 3) {
      activeCentroids.push(centroid);
      lockSynergyGroup(cluster, centroid, "lens", frame);
    } else if (cluster.length > 1) {
      ctx.strokeStyle = "rgba(255,255,255,0.035)";
      ctx.lineWidth = 1;

      for (let i = 0; i < cluster.length; i++) {
        for (let j = i + 1; j < cluster.length; j++) {
          line(cluster[i].pos.x, cluster[i].pos.y, cluster[j].pos.x, cluster[j].pos.y);
        }
      }
    }
  }

  let targetGlow = 0;
  const limit = 250;

  for (let i = 0; i < activeCentroids.length; i++) {
    for (let j = i + 1; j < activeCentroids.length; j++) {
      const a = activeCentroids[i];
      const b = activeCentroids[j];
      const d = dist(a.x, a.y, b.x, b.y);

      if (d < limit) {
        let intensity = map(d, 0, limit, 1, 0);
        intensity = Math.pow(intensity, 1.5);
        targetGlow += intensity * 0.8;

        drawElectricArc(a, b, intensity);

        if (d < 100 && frame % 2 < 1) {
          const t = Math.random();
          synergy.particles.push(
            new SynergyParticle(
              lerp(a.x, b.x, t) + random(-15, 15),
              lerp(a.y, b.y, t) + random(-15, 15),
              lerpColorArray(synergy.colors.triangle, synergy.colors.circle, Math.sin(frame * 0.05) * 0.5 + 0.5)
            )
          );
        }
      }
    }
  }

  synergy.globalGlow = lerp(synergy.globalGlow, Math.min(0.85, targetGlow), 0.08);

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

function lockSynergyGroup(cluster, centroid, mode, frame) {
  let id = -1;

  for (const s of cluster) {
    if (s.groupId >= 0) {
      id = s.groupId;
      break;
    }
  }

  const newGroup = id === -1;

  if (id === -1) {
    id = synergy.nextGroupId++;
    const col = mode === "triangle" ? synergy.colors.triangle : synergy.colors.circle;
    for (let i = 0; i < 30; i++) synergy.particles.push(new SynergyParticle(centroid.x, centroid.y, col));
  }

  if (mode === "triangle") {
    const angle = frame * 0.015;
    const radius = 45;
    let k = 0;

    for (const s of cluster) {
      s.grouped = true;
      s.groupId = id;
      s.targetColor = [...synergy.colors.triangle];

      if (k < 3) {
        const a = (k * Math.PI * 2) / 3 + angle;
        s.target.x = centroid.x + Math.cos(a) * radius;
        s.target.y = centroid.y + Math.sin(a) * radius;
      } else {
        s.target.x = centroid.x;
        s.target.y = centroid.y;
      }
      k++;
    }

    ctx.strokeStyle = rgba(synergy.colors.triangle, 0.2 + synergy.globalGlow * 0.4);
    ctx.lineWidth = 2 + synergy.globalGlow * 2;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3 + angle;
      const x = centroid.x + Math.cos(a) * radius;
      const y = centroid.y + Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  if (mode === "lens") {
    const angle = frame * 0.01;
    const spacing = 50;
    let sq = 0;

    for (const s of cluster) {
      s.grouped = true;
      s.groupId = id;

      if (s.type === 2) {
        s.target.x = centroid.x;
        s.target.y = centroid.y;
        s.targetColor = [...synergy.colors.circle];
      } else if (s.type === 1) {
        const sign = sq === 0 ? 1 : -1;
        s.target.x = centroid.x + Math.cos(angle) * spacing * sign;
        s.target.y = centroid.y + Math.sin(angle) * spacing * sign;
        s.targetColor = [...synergy.colors.square];
        sq++;
      }
    }

    ctx.strokeStyle = rgba(synergy.colors.circle, 0.24 + synergy.globalGlow * 0.4);
    ctx.lineWidth = 3 + synergy.globalGlow * 3;
    line(
      centroid.x - Math.cos(angle) * spacing * 1.5,
      centroid.y - Math.sin(angle) * spacing * 1.5,
      centroid.x + Math.cos(angle) * spacing * 1.5,
      centroid.y + Math.sin(angle) * spacing * 1.5
    );

    ctx.strokeStyle = rgba(synergy.colors.circle, 0.15 * (1 - (frame % 60) / 60));
    ctx.lineWidth = 1;
    strokeCircle(centroid.x, centroid.y, (frame % 60) * 2.5);
  }

  return newGroup;
}

function findSynergyClusters() {
  const clusters = [];
  const visited = new Array(synergy.shapes.length).fill(false);

  for (let i = 0; i < synergy.shapes.length; i++) {
    if (!visited[i]) {
      const cluster = [];
      dfsSynergy(i, visited, cluster);
      clusters.push(cluster);
    }
  }

  return clusters;
}

function dfsSynergy(index, visited, cluster) {
  visited[index] = true;
  const current = synergy.shapes[index];
  cluster.push(current);

  for (let i = 0; i < synergy.shapes.length; i++) {
    if (visited[i]) continue;

    const other = synergy.shapes[i];

    if (current.groupId >= 0) {
      if (other.groupId === current.groupId) dfsSynergy(i, visited, cluster);
    } else if (other.groupId === -1 && dist(current.pos.x, current.pos.y, other.pos.x, other.pos.y) < synergy.connectionDist) {
      dfsSynergy(i, visited, cluster);
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
  if (synergy.dragged) synergy.dragged.dragging = false;
  synergy.dragged = null;
}

//------------------------------------
// 2. Ruptura de la linea - ramas
//------------------------------------
const branchesWork = {
  circles: [],
  branches: [],
  flowSpeed: 2,
  spawnRate: 12,
  spawnCounter: 0,
  squarePos: vec(0, 0),
  squareActive: false,
  hueVal: 0,
  shakeIntensity: 0,
  prevMouse: vec(0, 0),
  start: vec(50, 90),
  end: vec(W - 50, H - 50),
  state: 0,
  colorResetFactor: 1,
  hues: [],
  hueIndex: 0,
  lastHue: -1
};

class BranchPath {
  constructor(breakPoint, clickPoint, exitPoint, dir, col) {
    this.breakPoint = clone(breakPoint);
    this.clickedPoint = clone(clickPoint);
    this.exitPoint = clone(exitPoint);
    this.dir = clone(dir);
    this.col = col;
    this.currentClick = clone(clickPoint);
    this.currentExit = clone(exitPoint);
    this.moving = false;
    this.squareT = 0;
    this.followers = [];
    this.separation = 38;
  }

  addFollower(c) {
    if (!c.inChain) {
      this.followers.push(c);
      c.inChain = true;
    }
  }

  update() {
    if (!this.moving) return;

    if (branchesWork.state !== 2) {
      const d = dist(this.clickedPoint.x, this.clickedPoint.y, this.exitPoint.x, this.exitPoint.y);
      if (d > 1) this.squareT = Math.min(1, this.squareT + branchesWork.flowSpeed / d);
      this.currentClick.x = lerp(this.clickedPoint.x, this.exitPoint.x, this.squareT);
      this.currentClick.y = lerp(this.clickedPoint.y, this.exitPoint.y, this.squareT);
    }

    const sep = branchesWork.state === 2 ? this.separation * branchesWork.colorResetFactor : this.separation;

    for (let i = 0; i < this.followers.length; i++) {
      const c = this.followers[i];
      c.pos.x = this.currentClick.x - this.dir.x * (i + 1) * sep;
      c.pos.y = this.currentClick.y - this.dir.y * (i + 1) * sep;
    }
  }

  display() {
    ctx.fillStyle = rgba(this.col, 0.12);
    rectCenter(this.currentClick.x, this.currentClick.y, 24, 24);

    ctx.fillStyle = rgba(this.col, 1);
    rectCenter(this.currentClick.x, this.currentClick.y, 16, 16);
  }
}

class FlowCircle {
  constructor() {
    this.segmentT = 0;
    this.pathStep = 0;
    this.pos = vec(0, 0);
    this.baseColor = hsbToRgb(0, 0, 45);
    this.dead = false;
    this.isRebel = false;
    this.activeBranch = null;
    this.inChain = false;
  }

  waypoint(step) {
    if (this.isRebel && this.activeBranch) {
      if (step === 0) return branchesWork.start;
      if (step === 1) return this.activeBranch.breakPoint;
      if (step === 2) return this.activeBranch.clickedPoint;
      return this.activeBranch.exitPoint;
    }

    if (step === 0) return branchesWork.start;
    return branchesWork.end;
  }

  maxSteps() {
    return this.isRebel ? 4 : 2;
  }

  update() {
    if (this.inChain) return;

    let a = this.waypoint(this.pathStep);
    let b = this.waypoint(this.pathStep + 1);
    const d = dist(a.x, a.y, b.x, b.y);

    if (d > 0.5) this.segmentT += branchesWork.flowSpeed / d;
    else this.segmentT = 1.1;

    if (this.segmentT >= 1) {
      this.segmentT = 0;

      if (this.isRebel && this.activeBranch) {
        if (this.pathStep === 1) this.activeBranch.moving = true;
        if (this.pathStep === 2) {
          this.activeBranch.addFollower(this);
          return;
        }
      }

      this.pathStep++;
    }

    if (this.pathStep >= this.maxSteps() - 1) {
      this.dead = true;
      return;
    }

    a = this.waypoint(this.pathStep);
    b = this.waypoint(this.pathStep + 1);
    this.pos.x = lerp(a.x, b.x, this.segmentT);
    this.pos.y = lerp(a.y, b.y, this.segmentT);
  }

  display() {
    let finalColor = this.baseColor;

    if (this.isRebel && this.activeBranch) {
      finalColor =
        branchesWork.state === 2
          ? lerpColorArray(this.baseColor, this.activeBranch.col, branchesWork.colorResetFactor)
          : this.activeBranch.col;
    }

    if (this.isRebel) {
      ctx.fillStyle = rgba(finalColor, 0.1);
      circle(this.pos.x, this.pos.y, 30);
    }

    ctx.fillStyle = rgba(finalColor, 1);
    circle(this.pos.x, this.pos.y, 16);
  }
}

function initBranches() {
  branchesWork.circles = [];
  branchesWork.branches = [];
  branchesWork.spawnCounter = 0;
  branchesWork.squareActive = false;
  branchesWork.hueVal = 0;
  branchesWork.shakeIntensity = 0;

  const stage = getStage();
  branchesWork.start = vec(stage.x + 20, stage.y + 20);
  branchesWork.end = vec(stage.x + stage.width - 20, stage.y + stage.height - 20);

  branchesWork.state = 0;
  branchesWork.colorResetFactor = 1;
  branchesWork.hues = [];

  for (let i = 0; i < 36; i++) branchesWork.hues.push(i * 10);
  shuffle(branchesWork.hues);
  branchesWork.hueIndex = 0;
  branchesWork.lastHue = -1;
}

function drawBranches(frame) {
  drawBaseBackground(0);

  if (frame % branchesWork.spawnRate < 1) {
    const activePathCount = branchesWork.branches.length + 1;
    const pathChoice = branchesWork.spawnCounter % activePathCount;
    branchesWork.spawnCounter++;

    const c = new FlowCircle();
    if (pathChoice > 0 && branchesWork.state !== 2) {
      c.isRebel = true;
      c.activeBranch = branchesWork.branches[pathChoice - 1];
    }

    branchesWork.circles.push(c);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  ctx.lineWidth = 1;
  line(branchesWork.start.x, branchesWork.start.y, branchesWork.end.x, branchesWork.end.y);

  for (let i = branchesWork.circles.length - 1; i >= 0; i--) {
    const c = branchesWork.circles[i];
    c.update();
    c.display();
    if (c.dead) branchesWork.circles.splice(i, 1);
  }

  for (const b of branchesWork.branches) {
    b.update();
    b.display();
  }

  if (branchesWork.squareActive) updateAndDrawBranchSquare();

  handleBranchReset();
}

function updateAndDrawBranchSquare() {
  branchesWork.squarePos.x = lerp(branchesWork.squarePos.x, pointer.x, 0.15);
  branchesWork.squarePos.y = lerp(branchesWork.squarePos.y, pointer.y, 0.15);

  const d = dist(pointer.x, pointer.y, branchesWork.prevMouse.x, branchesWork.prevMouse.y);
  branchesWork.shakeIntensity = lerp(branchesWork.shakeIntensity, d, 0.1);
  branchesWork.prevMouse.x = pointer.x;
  branchesWork.prevMouse.y = pointer.y;

  if (branchesWork.shakeIntensity > 5) {
    branchesWork.hueVal = (branchesWork.hueVal + branchesWork.shakeIntensity * 0.4) % 360;
  }

  const col = hsbToRgb(branchesWork.hueVal, 40, 95);

  ctx.strokeStyle = rgba(col, 0.4);
  ctx.lineWidth = 2 + branchesWork.shakeIntensity * 0.2;
  rectCenterStroke(
    branchesWork.squarePos.x,
    branchesWork.squarePos.y,
    24 + branchesWork.shakeIntensity * 0.5,
    24 + branchesWork.shakeIntensity * 0.5
  );

  ctx.fillStyle = rgba(col, 1);
  rectCenter(branchesWork.squarePos.x, branchesWork.squarePos.y, 16, 16);
}

function handleBranchReset() {
  if (branchesWork.state !== 2) return;

  branchesWork.colorResetFactor = lerp(branchesWork.colorResetFactor, 0, 0.02);

  let clean = true;

  for (const b of branchesWork.branches) {
    b.currentClick.x = lerp(b.currentClick.x, branchesWork.end.x, 0.04);
    b.currentClick.y = lerp(b.currentClick.y, branchesWork.end.y, 0.04);
    b.currentExit.x = lerp(b.currentExit.x, branchesWork.end.x, 0.04);
    b.currentExit.y = lerp(b.currentExit.y, branchesWork.end.y, 0.04);

    if (dist(b.currentClick.x, b.currentClick.y, branchesWork.end.x, branchesWork.end.y) > 10) clean = false;
  }

  if (clean && branchesWork.colorResetFactor < 0.01) {
    branchesWork.branches = [];

    for (const c of branchesWork.circles) {
      if (c.isRebel) c.dead = true;
    }

    branchesWork.state = 0;
    branchesWork.colorResetFactor = 1;
  }
}

function branchesTouch(x, y) {
  if (branchesWork.state === 0) {
    if (branchesWork.branches.length >= 5) {
      branchesWork.state = 2;
      return;
    }

    branchesWork.squareActive = true;
    const border = Math.floor(random(0, 4));

    if (border === 0) branchesWork.squarePos = vec(random(0, W), -20);
    else if (border === 1) branchesWork.squarePos = vec(random(0, W), H + 20);
    else if (border === 2) branchesWork.squarePos = vec(-20, random(0, H));
    else branchesWork.squarePos = vec(W + 20, random(0, H));

    branchesWork.prevMouse = vec(x, y);
    branchesWork.state = 1;
  } else if (branchesWork.state === 1) {
    branchesWork.squareActive = false;

    const ap = sub(branchesWork.squarePos, branchesWork.start);
    const ab = normalize(sub(branchesWork.end, branchesWork.start));
    let d = dot(ap, ab);
    d = clamp(d, 50, dist(branchesWork.start.x, branchesWork.start.y, branchesWork.end.x, branchesWork.end.y) - 100);

    const breakPoint = add(branchesWork.start, mult(ab, d));
    const dir = normalize(sub(branchesWork.squarePos, breakPoint));
    const exit = add(branchesWork.squarePos, mult(dir, 1000));

    const hue = branchesWork.hues[branchesWork.hueIndex];
    branchesWork.lastHue = hue;
    const col = hsbToRgb(hue, 40, 95);

    branchesWork.hueIndex++;

    if (branchesWork.hueIndex >= branchesWork.hues.length) {
      shuffle(branchesWork.hues);
      while (branchesWork.hues[0] === branchesWork.lastHue) shuffle(branchesWork.hues);
      branchesWork.hueIndex = 0;
    }

    branchesWork.branches.push(new BranchPath(breakPoint, clone(branchesWork.squarePos), exit, dir, col));
    branchesWork.state = 0;
  }
}

//------------------------------------
// 3. Ruptura de la linea - cuadrados
//------------------------------------
const rupture = {
  squares: [],
  particles: [],
  flowSpeed: 0.003,
  spawnRate: 14,
  start: vec(80, 90),
  end: vec(W - 80, H - 80),
  breakPoint: vec(W / 2, H / 2),
  targetPoint: vec(0, 0),
  newEnd: vec(0, 0),
  state: 0,
  activeColor: [110, 115, 125],
  spawnColored: false,
  selected: null,
  breakT: 0,
  stopFactor: 0,
  pathMorphFactor: 0,
  colorResetFactor: 1,
  timerStart: 0,
  timerDuration: 9000,
  shakeProgress: 0,
  shakeTarget: 150,
  colors: [
    [255, 183, 178],
    [255, 218, 193],
    [226, 240, 203],
    [191, 252, 198],
    [199, 206, 234],
    [255, 154, 162],
    [232, 197, 229],
    [175, 228, 222],
    [252, 225, 212]
  ]
};

class RuptureSquare {
  constructor() {
    this.t = 0;
    this.pos = vec(0, 0);
    this.baseColor = [110, 115, 125];
    this.isColored = rupture.spawnColored;
    this.isFollower = false;
    this.angle = random(0, Math.PI * 2);
    this.size = 14;

    if (this.isColored) this.isFollower = Math.random() > 0.4;
  }

  update() {
    this.angle += 0.01;

    if (this.isColored && (rupture.state === 1 || rupture.state === 2)) {
      this.t += rupture.flowSpeed * (1 - rupture.stopFactor);
    } else {
      this.t += rupture.flowSpeed;
    }

    const orig = this.originalPath(this.t);
    const frozen = vec(0, 0);

    if (this.t < rupture.breakT) {
      const norm = rupture.breakT > 0 ? this.t / rupture.breakT : 0;
      frozen.x = lerp(rupture.start.x, rupture.breakPoint.x, norm);
      frozen.y = lerp(rupture.start.y, rupture.breakPoint.y, norm) + Math.sin(this.t * Math.PI * 4) * 8;
    } else {
      frozen.x = rupture.breakPoint.x;
      frozen.y = rupture.breakPoint.y;
    }

    const alt = this.brokenPath(this.t);
    const base = vec(orig.x, orig.y);

    if (this.isColored) {
      base.x = lerp(orig.x, frozen.x, rupture.stopFactor);
      base.y = lerp(orig.y, frozen.y, rupture.stopFactor);
    }

    if (this.isFollower) {
      this.pos.x = lerp(base.x, alt.x, rupture.pathMorphFactor);
      this.pos.y = lerp(base.y, alt.y, rupture.pathMorphFactor);
    } else {
      this.pos.x = lerp(base.x, orig.x, rupture.pathMorphFactor);
      this.pos.y = lerp(base.y, orig.y, rupture.pathMorphFactor);
    }
  }

  display() {
    let finalColor = this.baseColor;
    let gradient = false;

    if (this.isColored && this.isFollower) {
      gradient = true;
      finalColor =
        rupture.state === 4
          ? lerpColorArray(this.baseColor, rupture.activeColor, rupture.colorResetFactor)
          : rupture.activeColor;
    }

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);

    if (gradient) {
      for (let j = 0; j < this.size; j++) {
        const t = j / this.size;
        const col = lerpColorArray(finalColor, [255, 255, 255], 0.45 * t);
        ctx.strokeStyle = rgba(col, 1);
        line(-this.size / 2, -this.size / 2 + j, this.size / 2, -this.size / 2 + j);
      }

      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1;
      ctx.strokeRect(-this.size / 2, -this.size / 2, this.size, this.size);
    } else {
      ctx.fillStyle = rgba(finalColor, 1);
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1.5;
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
      ctx.strokeRect(-this.size / 2, -this.size / 2, this.size, this.size);
    }

    ctx.restore();
  }

  originalPath(t) {
    return vec(
      lerp(rupture.start.x, rupture.end.x, t),
      lerp(rupture.start.y, rupture.end.y, t) + Math.sin(t * Math.PI * 4) * 8
    );
  }

  brokenPath(t) {
    if (t < rupture.breakT) {
      const norm = rupture.breakT > 0 ? t / rupture.breakT : 0;
      return vec(
        lerp(rupture.start.x, rupture.breakPoint.x, norm),
        lerp(rupture.start.y, rupture.breakPoint.y, norm) + Math.sin(t * Math.PI * 4) * 8
      );
    }

    const norm = map(t, rupture.breakT, 1, 0, 1);
    return vec(
      lerp(rupture.breakPoint.x, rupture.newEnd.x, norm),
      lerp(rupture.breakPoint.y, rupture.newEnd.y, norm) + Math.sin(t * Math.PI * 4) * 8
    );
  }
}

class RuptureParticle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = random(-4, 4);
    this.vy = random(-4, 4);
    this.size = random(2, 6);
    this.alpha = 1;
    this.color = color;
    this.decay = random(0.012, 0.032);
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
  }

  display() {
    ctx.fillStyle = rgba(this.color, this.alpha);
    circle(this.x, this.y, this.size);
  }
}

function initRupture() {
  rupture.squares = [];
  rupture.particles = [];

  const stage = getStage();
  rupture.start = vec(stage.x + 30, stage.y + 20);
  rupture.end = vec(stage.x + stage.width - 30, stage.y + stage.height - 20);
  rupture.breakPoint = vec(stage.x + stage.width / 2, stage.y + stage.height / 2);
  rupture.targetPoint = vec(0, 0);
  rupture.newEnd = vec(0, 0);
  rupture.state = 0;
  rupture.activeColor = [110, 115, 125];
  rupture.spawnColored = false;
  rupture.selected = null;
  rupture.breakT = 0;
  rupture.stopFactor = 0;
  rupture.pathMorphFactor = 0;
  rupture.colorResetFactor = 1;
  rupture.shakeProgress = 0;
}

function drawRupture(frame, now) {
  drawBaseBackground(0);

  if (frame % rupture.spawnRate < 1) {
    rupture.squares.push(new RuptureSquare());
  }

  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  ctx.lineWidth = 1;
  line(rupture.start.x, rupture.start.y, rupture.end.x, rupture.end.y);

  if (rupture.state === 1) {
    const d = dist(pointer.x, pointer.y, rupture.breakPoint.x, rupture.breakPoint.y);

    if (d < 50) {
      const speed = dist(pointer.x, pointer.y, pointer.px, pointer.py);

      if (speed > 10) {
        rupture.shakeProgress += speed * 0.15;

        if (frame % 3 < 1) {
          rupture.activeColor = randomFrom(rupture.colors);
          createRuptureExplosion(rupture.breakPoint.x, rupture.breakPoint.y, rupture.activeColor, 2);
        }

        if (rupture.shakeProgress >= rupture.shakeTarget) {
          createRuptureExplosion(rupture.breakPoint.x, rupture.breakPoint.y, rupture.activeColor, 35);
          rupture.state = 2;
        }
      }
    }
  }

  if (rupture.state === 3) {
    ctx.strokeStyle = rgba(rupture.activeColor, 0.12);
    ctx.lineWidth = 1;
    line(rupture.start.x, rupture.start.y, rupture.breakPoint.x, rupture.breakPoint.y);
    line(rupture.breakPoint.x, rupture.breakPoint.y, rupture.newEnd.x, rupture.newEnd.y);
  }

  for (let i = rupture.squares.length - 1; i >= 0; i--) {
    const s = rupture.squares[i];
    s.update();
    s.display();

    const stage = getStage();
    const out =
      s.pos.x < stage.x - 80 ||
      s.pos.x > stage.x + stage.width + 80 ||
      s.pos.y < stage.y - 80 ||
      s.pos.y > stage.y + stage.height + 80;
    if (s.t >= 1 || out) rupture.squares.splice(i, 1);
  }

  for (let i = rupture.particles.length - 1; i >= 0; i--) {
    const p = rupture.particles[i];
    p.update();
    p.display();
    if (p.alpha <= 0) rupture.particles.splice(i, 1);
  }

  handleRuptureTransitions(now);
}

function ruptureMousePressed(x, y) {
  if (rupture.state === 0) {
    if (rupture.squares.length === 0) return;

    let minD = Infinity;
    let closest = null;

    for (const s of rupture.squares) {
      const d = dist(x, y, s.pos.x, s.pos.y);
      if (d < minD && d < 45) {
        minD = d;
        closest = s;
      }
    }

    if (closest) {
      rupture.selected = closest;
      rupture.breakT = closest.t;
      rupture.activeColor = [161, 161, 170];

      for (const s of rupture.squares) {
        if (s.t <= rupture.breakT) {
          s.isColored = true;
          s.isFollower = true;
        }
      }

      rupture.spawnColored = true;
      rupture.state = 1;
      rupture.stopFactor = 0;
    }
  } else if (rupture.state === 2) {
    rupture.targetPoint = vec(x, y);

    let dir = normalize(sub(rupture.targetPoint, rupture.breakPoint));
    dir = mult(dir, -1);

    const originalLength = dist(rupture.start.x, rupture.start.y, rupture.end.x, rupture.end.y);
    const remaining = originalLength * (1 - rupture.breakT);

    rupture.newEnd = add(rupture.breakPoint, mult(dir, remaining * 1.5));

    createRuptureExplosion(rupture.breakPoint.x, rupture.breakPoint.y, rupture.activeColor, 40);

    rupture.state = 3;
    rupture.timerStart = performance.now();
  }
}

function handleRuptureTransitions(now) {
  if (rupture.state === 1 || rupture.state === 2) {
    rupture.stopFactor = lerp(rupture.stopFactor, 1, 0.05);
  }

  if (rupture.state === 3) {
    rupture.pathMorphFactor = lerp(rupture.pathMorphFactor, 1, 0.06);

    if (now - rupture.timerStart >= rupture.timerDuration) {
      rupture.state = 4;
      rupture.spawnColored = false;
    }
  } else if (rupture.state === 4) {
    rupture.pathMorphFactor = lerp(rupture.pathMorphFactor, 0, 0.03);
    rupture.stopFactor = lerp(rupture.stopFactor, 0, 0.03);
    rupture.colorResetFactor = lerp(rupture.colorResetFactor, 0, 0.02);

    if (rupture.pathMorphFactor < 0.01 && rupture.stopFactor < 0.01 && rupture.colorResetFactor < 0.01) {
      initRupture();
    }
  }
}

function createRuptureExplosion(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    rupture.particles.push(new RuptureParticle(x, y, color));
  }
}

//------------------------------------
// Loop
//------------------------------------
initSynergy();
initBranches();
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
// click/touch real (branchesTouch, ruptureMousePressed),
// solo que disparadas por un timer en vez de la mano.
//------------------------------------
const isMini = urlParams.get("mini") === "1";

if (isMini) {
  // El ritmo de los clicks simulados se ajusta desde mini-sim-config.js
  // (window.MINI_SIM_CONFIG.click), no acá.
  const clickCfg = (window.MINI_SIM_CONFIG && window.MINI_SIM_CONFIG.click) || {};
  const clickIntervalMin = clickCfg.intervalMin ?? 5000;
  const clickIntervalMax = clickCfg.intervalMax ?? 6000;

  // Sinergias ya se anima sola (sin necesidad de simular nada).

  // Ramas: completa una rama nueva cada tanto (ritmo configurable)
  function scheduleBranchClick() {
    const wait = random(clickIntervalMin, clickIntervalMax);

    setTimeout(() => {
      if (currentWork === "ramas" && branchesWork.branches.length < 5) {
        const stage = getStage();
        const x = random(stage.x + 30, stage.x + stage.width - 30);
        const y = random(stage.y + 30, stage.y + stage.height - 30);

        branchesTouch(x, y); // define el punto de salida
        setTimeout(() => branchesTouch(x, y), 180); // confirma la rama
      }

      scheduleBranchClick();
    }, wait);
  }

  scheduleBranchClick();

  // Ruptura: selecciona un cuadrado de la línea automáticamente
  // (mismo ritmo configurable que el resto de los clicks)
  function scheduleRuptureClick() {
    const wait = random(clickIntervalMin, clickIntervalMax);

    setTimeout(() => {
      if (currentWork === "ruptura") {
        if (rupture.state === 0 && rupture.squares.length > 0) {
          const target = randomFrom(rupture.squares);
          ruptureMousePressed(target.pos.x, target.pos.y);
        } else if (rupture.state === 2) {
          const angle = Math.random() * Math.PI * 2;
          const tx = rupture.breakPoint.x + Math.cos(angle) * 220;
          const ty = rupture.breakPoint.y + Math.sin(angle) * 220;
          ruptureMousePressed(tx, ty);
        }
      }

      scheduleRuptureClick();
    }, wait);
  }

  scheduleRuptureClick();

  // Ruptura: mientras está "agarrado" (state 1), simula el
  // puntero temblando cerca del punto de quiebre -- es
  // exactamente la condición que usa el código real para
  // acumular el "shake" y disparar la ruptura. Esto no es un
  // click nuevo sino la textura de un gesto ya en curso, así
  // que mantiene su propio ritmo rápido y no usa la config.
  setInterval(() => {
    if (currentWork === "ruptura" && rupture.state === 1) {
      pointer.px = pointer.x;
      pointer.py = pointer.y;
      pointer.x = rupture.breakPoint.x + random(-30, 30);
      pointer.y = rupture.breakPoint.y + random(-30, 30);
    }
  }, 40);
}

let frame = 0;

function animate(now = performance.now()) {
  requestAnimationFrame(animate);
  frame++;

  if (currentWork === "sinergias") drawSynergy(frame);
  if (currentWork === "ramas") drawBranches(frame);
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