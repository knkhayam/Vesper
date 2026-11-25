const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

let dpr = 1;
let viewW = 0;
let viewH = 0;

let base = randomColor(null);
let nextBase = null;
let pointer = null;
let inside = false;
let emitX = 0;
let emitY = 0;
let focusX = 0;
let focusY = 0;
let focusReady = false;
let speed = 0;
let cruise = 0;
let energy = 0;
let time = 0;
let spawnAcc = 10;
let flash = 0;
let shakeMag = 0;
let blasting = false;
let blastT = 0;
let blastX = 0;
let blastY = 0;
let committed = false;

const samples = [];
const rings = [];
const sparks = [];
const dust = [];
const heroes = [];
const smudges = [];
const bodies = [];
const MAX_CRUISE = 0.68;

const BODY_SPECS = [
  { name: "Sun", kind: "sun", r: 86 },
  { name: "Mercury", kind: "mercury", r: 11 },
  { name: "Venus", kind: "venus", r: 18 },
  { name: "Earth", kind: "earth", r: 20 },
  { name: "Moon", kind: "moon", r: 9 },
  { name: "Mars", kind: "mars", r: 15 },
  { name: "Jupiter", kind: "jupiter", r: 48 },
  { name: "Saturn", kind: "saturn", r: 40 },
  { name: "Uranus", kind: "uranus", r: 24 },
  { name: "Neptune", kind: "neptune", r: 23 },
  { name: "Comet", kind: "comet", r: 18 },
  { name: "Ceres", kind: "asteroid", r: 14 },
  { name: "Vesta", kind: "asteroid", r: 11 }
];
const taleLine = document.getElementById("line");
const skyLine = document.getElementById("sky");
let shownTale = "";
let shownSky = "";
let camX = 0;
let camY = 0;
let impactName = "";
let closingName = "";
let shipAngle = 0.2;
let shipRadius = 0.35;
let shipX = 0.35;
let shipY = 0;
let heading = -Math.PI / 2;
let steerX = 0;
let steerY = 0;
let dragging = false;
let dragX0 = 0;
let dragY0 = 0;
let dragX = 0;
let dragY = 0;
let crackLife = 0;
let shownWarn = "";
const trail = [];
const cracks = [];
const SHIP_NAME = "Vesper";

function randomColor(prevHue) {
  let hue = Math.random() * 360;
  if (prevHue != null) {
    let guard = 0;
    while (hueDistance(hue, prevHue) < 72 && guard++ < 24) {
      hue = Math.random() * 360;
    }
  }
  return {
    h: hue,
    s: 58 + Math.random() * 24,
    l: 36 + Math.random() * 12
  };
}

function hueDistance(a, b) {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function cssHsl(color) {
  return "hsl(" + color.h.toFixed(1) + ", " + color.s.toFixed(1) + "%, " + color.l.toFixed(1) + "%)";
}

function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) { r = c; g = x; }
  else if (hp < 2) { r = x; g = c; }
  else if (hp < 3) { g = c; b = x; }
  else if (hp < 4) { g = x; b = c; }
  else if (hp < 5) { r = x; b = c; }
  else { r = c; b = x; }
  const m = l - c / 2;
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

function mixRgb(a, b, t) {
  return {
    r: Math.round(lerp(a.r, b.r, t)),
    g: Math.round(lerp(a.g, b.g, t)),
    b: Math.round(lerp(a.b, b.b, t))
  };
}

function rgba(color, alpha) {
  return "rgba(" + color.r + ", " + color.g + ", " + color.b + ", " + alpha + ")";
}

function applyBackground() {
  document.documentElement.style.setProperty("--bg", "#060714");
}

function makeDust(spreadZ) {
  return {
    ox: (Math.random() * 2 - 1) * 0.98,
    oy: (Math.random() * 2 - 1) * 0.98,
    z: spreadZ ? Math.random() * 0.9 + 0.08 : 0.82 + Math.random() * 0.18,
    kind: Math.random(),
    bright: 0.35 + Math.random() * 0.65
  };
}

function makeHero(i) {
  return {
    ox: (Math.random() * 2 - 1) * 0.7,
    oy: (Math.random() * 2 - 1) * 0.7,
    z: 0.32 + Math.random() * 0.62,
    len: 24 + Math.random() * 40,
    slot: i
  };
}

function makeSmudge() {
  return {
    ox: (Math.random() * 2 - 1) * 0.85,
    oy: (Math.random() * 2 - 1) * 0.85,
    z: 0.35 + Math.random() * 0.6,
    rot: Math.random() * Math.PI,
    rw: 7 + Math.random() * 20,
    rh: 1.6 + Math.random() * 3.4
  };
}

function placeBody(body, ahead) {
  const lane = body.kind === "sun" ? Math.random() < 0.72 : Math.random() < 0.38;
  const spread = lane ? Math.random() * (body.kind === "sun" ? 0.008 : 0.004) : 0.05 + Math.random() * 0.2;
  const ang = Math.random() * Math.PI * 2;
  body.wx = camX + Math.cos(ang) * spread;
  body.wy = camY + Math.sin(ang) * spread;
  body.z = ahead ? 0.62 + Math.random() * 0.38 : 0.3 + Math.random() * 0.62;
}

function buildBodies() {
  bodies.length = 0;
  for (let i = 0; i < BODY_SPECS.length; i++) {
    const spec = BODY_SPECS[i];
    const body = {
      name: spec.name,
      kind: spec.kind,
      r: spec.r,
      spin: Math.random() * Math.PI * 2,
      spinRate: 0.35 + Math.random() * 0.7,
      wx: 0,
      wy: 0,
      z: 1
    };
    placeBody(body, false);
    bodies.push(body);
  }
  steerX = 0;
  steerY = 0;
}

function buildFlight() {
  dust.length = 0;
  heroes.length = 0;
  smudges.length = 0;
  const count = Math.max(1100, Math.min(1800, Math.round(viewW * viewH / 900)));
  for (let i = 0; i < count; i++) dust.push(makeDust(true));
  for (let i = 0; i < 10; i++) heroes.push(makeHero(i));
  for (let i = 0; i < 18; i++) smudges.push(makeSmudge());
  buildBodies();
}

function arrangeGalaxy() {
  for (let i = 0; i < heroes.length; i++) {
    const hero = heroes[i];
    hero.ox = camX + (Math.random() * 2 - 1) * 0.72;
    hero.oy = camY + (Math.random() * 2 - 1) * 0.72;
    hero.z = 0.38 + Math.random() * 0.55;
    hero.len = 24 + Math.random() * 42;
  }
  for (let i = 0; i < smudges.length; i++) {
    const blob = smudges[i];
    blob.ox = camX + (Math.random() * 2 - 1) * 0.85;
    blob.oy = camY + (Math.random() * 2 - 1) * 0.85;
    blob.z = 0.4 + Math.random() * 0.55;
    blob.rot = Math.random() * Math.PI;
  }
  for (let i = 0; i < dust.length; i++) {
    if (Math.random() < 0.45) {
      dust[i].ox = camX + (Math.random() * 2 - 1) * 0.98;
      dust[i].oy = camY + (Math.random() * 2 - 1) * 0.98;
      dust[i].z = 0.45 + Math.random() * 0.55;
      dust[i].kind = Math.random();
    } else {
      dust[i].z = clamp(dust[i].z + 0.2, 0.15, 1);
    }
  }
  for (let i = 0; i < bodies.length; i++) placeBody(bodies[i], true);
  steerX = 0;
  steerY = 0;
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  viewW = window.innerWidth;
  viewH = window.innerHeight;
  canvas.width = Math.max(1, Math.floor(viewW * dpr));
  canvas.height = Math.max(1, Math.floor(viewH * dpr));
  canvas.style.width = viewW + "px";
  canvas.style.height = viewH + "px";
  buildFlight();
}

function trackPointer(event) {
  const x = event.clientX;
  const y = event.clientY;
  if (x < 0 || y < 0 || x > viewW || y > viewH) {
    inside = false;
    samples.length = 0;
    return;
  }
  inside = true;
  if (!pointer) {
    emitX = x;
    emitY = y;
    spawnAcc = 10;
  }
  pointer = { x: x, y: y };
  samples.push({ t: performance.now(), x: x, y: y });
}

function endDrag(event) {
  if (!dragging) return;
  const dx = event.clientX - dragX0;
  const dy = event.clientY - dragY0;
  dragging = false;
  const len = Math.hypot(dx, dy);
  if (len < 18) {
    steerX = 0;
    steerY = 0;
    heading = -Math.PI / 2;
    return;
  }
  const power = clamp((len - 18) / 150, 0.28, 1);
  steerX = (dx / len) * power;
  steerY = (dy / len) * power;
  heading = Math.atan2(steerY, steerX);
}

window.addEventListener("pointerenter", trackPointer, { passive: true });
window.addEventListener("pointermove", function (event) {
  trackPointer(event);
  if (dragging) {
    dragX = event.clientX;
    dragY = event.clientY;
  }
}, { passive: true });
window.addEventListener("pointerdown", function (event) {
  trackPointer(event);
  dragging = true;
  dragX0 = event.clientX;
  dragY0 = event.clientY;
  dragX = dragX0;
  dragY = dragY0;
});
window.addEventListener("pointerup", endDrag);
window.addEventListener("pointercancel", endDrag);
window.addEventListener("pointerleave", function (event) {
  inside = false;
  samples.length = 0;
  endDrag(event);
});

function readSpeed(now) {
  const horizon = now - 130;
  while (samples.length && samples[0].t < horizon) samples.shift();
  if (samples.length < 2) return 0;
  const a = samples[0];
  const b = samples[samples.length - 1];
  const dt = (b.t - a.t) / 1000;
  if (dt < 0.016) return 0;
  return Math.min(4000, Math.hypot(b.x - a.x, b.y - a.y) / dt);
}

function makeRing(x, y, kind) {
  const diag = Math.hypot(viewW, viewH);
  if (kind === "blast") {
    return {
      kind: "blast",
      x: x,
      y: y,
      maxR: diag * (0.22 + Math.random() * 0.9),
      dur: 0.36 + Math.random() * 0.32,
      age: -Math.random() * 0.08,
      seed: Math.random() * 1000,
      width: 2.4 + Math.random() * 3.2
    };
  }
  return {
    kind: "wave",
    x: x,
    y: y,
    maxR: 42 + Math.random() * 46,
    dur: 0.72 + Math.random() * 0.28,
    age: 0,
    seed: Math.random() * 1000,
    linkAngle: Math.random() * Math.PI * 2,
    width: 1.6 + Math.random() * 1.35
  };
}

function spawnWave(x, y) {
  rings.push(makeRing(x, y, "wave"));
  if (rings.length > 36) rings.splice(0, rings.length - 36);
}

function burst(x, y) {
  const count = reduceMotion ? 36 : 100;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const sp = 80 + Math.pow(Math.random(), 0.55) * 1280;
    sparks.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * sp,
      vy: Math.sin(angle) * sp,
      life: 1,
      decay: 0.55 + Math.random() * 1.05,
      width: 1.2 + Math.random() * 2.4
    });
  }
}

function startBlast(name, x, y) {
  if (blasting || !pointer) return;
  impactName = name || "a world";
  blasting = true;
  blastT = 0;
  committed = false;
  flash = 0.55;
  shakeMag = reduceMotion ? 8 : 36;
  nextBase = randomColor(base.h);
  base = { h: nextBase.h, s: nextBase.s, l: nextBase.l };
  committed = true;
  arrangeGalaxy();
  cruise = 0.16;
  energy = 0.16;
  closingName = "";
  blastX = x == null ? viewW * 0.5 : x;
  blastY = y == null ? viewH * 0.5 : y;
  for (let i = 0; i < rings.length; i++) {
    const ring = rings[i];
    if (ring.kind === "wave") ring.dur = Math.min(ring.dur, Math.max(0.06, ring.age + 0.16));
  }
  const blastCount = reduceMotion ? 4 : 9;
  for (let i = 0; i < blastCount; i++) rings.push(makeRing(blastX, blastY, "blast"));
  burst(blastX, blastY);
  shatter(blastX, blastY);
}

function tremor(seed, amp, t) {
  if (amp < 0.4) return { x: 0, y: 0 };
  const x = Math.sin(t * 43 + seed) * 0.62
    + Math.sin(t * 71.5 + seed * 1.7) * 0.38
    + Math.sin(t * 29.2 + seed * 0.35) * 0.24;
  const y = Math.cos(t * 39.4 + seed * 1.25) * 0.58
    + Math.sin(t * 83.2 + seed) * 0.42
    + Math.cos(t * 21.6 + seed * 2.05) * 0.22;
  return { x: x * amp, y: y * amp };
}

function strokeShape(x, y, r, seed, split, wobble) {
  if (r < 0.8) return;
  const pieces = split < 0.2 ? 1 : 9;
  if (pieces === 1 && wobble < 0.8) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  const steps = pieces === 1 ? 84 : 16;
  for (let i = 0; i < pieces; i++) {
    const span = (Math.PI * 2) / pieces;
    const gap = pieces === 1 ? 0 : span * split * 0.7;
    const a0 = span * i + seed * 0.15 + time * split;
    const a1 = a0 + span - gap;
    const mid = (a0 + a1) * 0.5;
    const fly = split * split * (22 + r * 0.06);
    const ox = Math.cos(mid) * fly;
    const oy = Math.sin(mid) * fly;
    ctx.beginPath();
    for (let s = 0; s <= steps; s++) {
      const a = a0 + (a1 - a0) * (s / steps);
      const wr = r + (wobble > 0.4
        ? wobble * (
          Math.sin(time * 48 + seed + a * 2) * 0.55 +
          Math.sin(time * 81 + seed * 1.4 + a * 11) * 0.45
        )
        : 0);
      const px = x + ox + Math.cos(a) * Math.max(0, wr);
      const py = y + oy + Math.sin(a) * Math.max(0, wr);
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    if (pieces === 1) ctx.closePath();
    ctx.stroke();
  }
}

function paintRing(x, y, r, color, alpha, width, seed, split, wobble) {
  if (alpha < 0.015 || r < 1) return;
  const hotWhite = mixRgb(color, { r: 255, g: 248, b: 240 }, 0.55);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.lineWidth = width * 6.5;
  ctx.strokeStyle = rgba(color, alpha * 0.22);
  strokeShape(x, y, r, seed, split, wobble);

  ctx.lineWidth = width * 2.15;
  ctx.strokeStyle = rgba(color, alpha * 0.92);
  strokeShape(x, y, r, seed, split, wobble);

  ctx.lineWidth = Math.max(1, width * 0.55);
  ctx.strokeStyle = rgba(hotWhite, alpha * 0.8);
  strokeShape(x, y, r, seed, split, wobble);
}

function waveColor(redLevel, ignition) {
  const calm = hslToRgb((base.h + 36) % 360, 22, 96);
  const hot = { r: 255, g: 36, b: 28 };
  const mixed = mixRgb(calm, hot, redLevel);
  return mixRgb(mixed, { r: 255, g: 236, b: 220 }, ignition);
}

function backgroundColor(amount) {
  const heat = Math.pow(clamp(amount, 0, 1), 1.25);
  const flicker = reduceMotion
    ? 0
    : clamp(Math.sin(time * (10 + amount * 42)) * Math.pow(amount, 2.3) * 6, -3.5, 3.5);
  return {
    h: base.h,
    s: clamp(base.s + heat * 10, 0, 100),
    l: clamp(base.l - heat * 12 + flicker, 16, 68)
  };
}

function update(dt, now) {
  const targetSpeed = inside ? readSpeed(now) : 0;
  speed += (targetSpeed - speed) * (1 - Math.exp(-dt * 12));

  focusX = viewW * 0.5;
  focusY = viewH * 0.5;
  focusReady = viewW > 2;
  if (pointer && inside) {
    const follow = 1 - Math.exp(-dt * 18);
    emitX += (pointer.x - emitX) * follow;
    emitY += (pointer.y - emitY) * follow;
  }

  if (blasting) {
    blastT += dt;
    cruise += (0.14 - cruise) * Math.min(1, dt * 2.4);
    if (blastT >= 0.85) {
      blasting = false;
      flash = 0;
    }
  } else if (pointer && inside && !dragging) {
    if (speed < 90) {
      const hold = 1 - speed / 90;
      cruise += dt * (0.05 + cruise * 0.32) * (0.4 + hold * 0.6);
    } else {
      const turn = clamp((speed - 90) / 780, 0, 1);
      cruise -= dt * (0.22 + turn * 1.05);
    }
    cruise = clamp(cruise, 0, MAX_CRUISE);
  } else if (!dragging) {
    cruise += (0 - cruise) * Math.min(1, dt * 0.6);
  }
  energy = cruise * 0.48;
  stepFlight(dt);

  flash = Math.max(0, flash - dt / 0.46);
  shakeMag = Math.max(0, shakeMag - dt * 54);
  if (!blasting) crackLife = Math.max(0, crackLife - dt * 0.28);

  const movingFast = speed >= 260;
  const canSpawn = pointer && inside && (!blasting || committed) && !movingFast;
  if (movingFast) {
    spawnAcc = 0;
  } else if (canSpawn) {
    spawnAcc += dt;
    const interval = lerp(0.62, 0.45, Math.pow(energy, 1.2));
    if (spawnAcc >= interval) {
      spawnAcc = 0;
      spawnWave(emitX, emitY);
    }
  }

  for (let i = rings.length - 1; i >= 0; i--) {
    rings[i].age += dt;
    if (rings[i].age >= rings[i].dur) rings.splice(i, 1);
  }

  for (let i = sparks.length - 1; i >= 0; i--) {
    const spark = sparks[i];
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    const drag = Math.exp(-dt * 1.35);
    spark.vx *= drag;
    spark.vy *= drag;
    spark.life -= spark.decay * dt;
    if (spark.life <= 0) sparks.splice(i, 1);
  }
}

function wavePose(ring, tremorLevel) {
  const p = clamp(ring.age / ring.dur, 0, 1);
  const radius = easeOutCubic(p) * ring.maxR;
  const fadeIn = Math.min(1, ring.age / 0.08);
  const fadeOut = 1 - smoothstep(0.5, 1, p);
  const jitterAmp = Math.pow(tremorLevel, 1.05) * (reduceMotion ? 5 : 22);
  const j = tremor(ring.seed, jitterAmp, time);
  return {
    x: ring.x + j.x,
    y: ring.y + j.y,
    r: radius,
    alpha: fadeIn * fadeOut,
    width: ring.width,
    seed: ring.seed,
    linkAngle: ring.linkAngle
  };
}

function newestWavePair() {
  let last = null;
  let prev = null;
  for (let i = rings.length - 1; i >= 0; i--) {
    if (rings[i].kind !== "wave" || rings[i].age <= 0) continue;
    if (!last) last = rings[i];
    else {
      prev = rings[i];
      break;
    }
  }
  if (!last || !prev) return null;
  return [last, prev];
}

function bridgePoints(newer, older) {
  const dx = older.x - newer.x;
  const dy = older.y - newer.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 14 && dist > newer.r + older.r + 3) {
    const ux = dx / dist;
    const uy = dy / dist;
    return {
      x1: newer.x + ux * newer.r,
      y1: newer.y + uy * newer.r,
      x2: older.x - ux * older.r,
      y2: older.y - uy * older.r
    };
  }
  const inner = Math.min(newer.r, older.r);
  const outer = Math.max(newer.r, older.r);
  const ang = dist > 14
    ? Math.atan2(dy, dx)
    : newer.linkAngle + Math.sin(time * 1.3) * 0.4;
  return {
    x1: newer.x + Math.cos(ang) * inner,
    y1: newer.y + Math.sin(ang) * inner,
    x2: newer.x + Math.cos(ang) * outer,
    y2: newer.y + Math.sin(ang) * outer
  };
}

function drawBridge(redLevel, ignition, tremorLevel) {
  const pair = newestWavePair();
  if (!pair) return;
  const newer = wavePose(pair[0], tremorLevel);
  const older = wavePose(pair[1], tremorLevel);
  const alpha = Math.min(newer.alpha, older.alpha);
  if (alpha < 0.03) return;
  const ends = bridgePoints(newer, older);
  const dx = ends.x2 - ends.x1;
  const dy = ends.y2 - ends.y1;
  const len = Math.hypot(dx, dy);
  if (len < 3) return;
  const nx = -dy / len;
  const ny = dx / len;
  const color = waveColor(redLevel, ignition);
  const core = mixRgb(color, { r: 255, g: 248, b: 240 }, 0.55);
  const split = smoothstep(0.9, 1, tremorLevel);
  const amp = Math.pow(smoothstep(0.32, 1, tremorLevel), 1.3) * 8;

  function trace(strokeStyle, lineWidth) {
    const segments = split > 0.25 ? 2 : 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    for (let seg = 0; seg < segments; seg++) {
      const t0 = segments === 1 ? 0 : (seg === 0 ? 0 : 0.58);
      const t1 = segments === 1 ? 1 : (seg === 0 ? 0.42 : 1);
      const fly = split * split * 16 * (seg === 0 ? -1 : 1);
      ctx.beginPath();
      const steps = 18;
      for (let s = 0; s <= steps; s++) {
        const u = t0 + (t1 - t0) * (s / steps);
        const wob = amp * (
          Math.sin(time * 46 + newer.seed + u * 11) * 0.55 +
          Math.sin(time * 79 + newer.seed * 1.3 + u * 19) * 0.45
        );
        const px = ends.x1 + dx * u + nx * (wob + fly);
        const py = ends.y1 + dy * u + ny * (wob + fly);
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }

  trace(rgba(color, alpha * 0.22), newer.width * 6.5);
  trace(rgba(color, alpha * 0.92), newer.width * 2.15);
  trace(rgba(core, alpha * 0.8), Math.max(1, newer.width * 0.55));

  const u = (time * 0.42) % 1;
  const wob = amp * (
    Math.sin(time * 46 + newer.seed + u * 11) * 0.55 +
    Math.sin(time * 79 + newer.seed * 1.3 + u * 19) * 0.45
  );
  ctx.beginPath();
  ctx.arc(ends.x1 + dx * u + nx * wob, ends.y1 + dy * u + ny * wob, 2.3, 0, Math.PI * 2);
  ctx.fillStyle = rgba(core, alpha);
  ctx.fill();
}

function skyWord(h) {
  const names = ["ember", "saffron", "new leaf", "lagoon", "harbor", "vesper", "lilac", "rose ash"];
  const index = Math.floor((((h % 360) + 360) % 360) / 45) % names.length;
  return names[index];
}

function currentTale() {
  const struck = impactName === "Sun" ? "the Sun" : impactName;
  if (blasting) return "The glass breaks on " + struck + ". A new sky settles behind it.";
  if (dragging) return "Drag across the glass, then let go. " + SHIP_NAME + " will fly that way.";
  if (closingName) return SHIP_NAME + " is falling toward " + closingName + ".";
  if (!pointer || !inside) return "Drag to turn the dive. Tap to fly straight.";
  if (speed >= 260) return "A quick hand slows " + SHIP_NAME + ".";
  if (cruise > MAX_CRUISE - 0.04) return "Top speed. Drag toward a world, or tap to dive straight into it.";
  return SHIP_NAME + " dives through the star field. Drag to turn. Tap to fly straight.";
}

function warningList() {
  const notes = [];
  if (blasting || crackLife > 0.45) notes.push({ level: "crit", text: "Glass broken — impact" });
  if (closingName) notes.push({ level: "alert", text: "Closing on " + closingName });
  if (dragging) notes.push({ level: "info", text: "Release to turn" });
  if (Math.hypot(steerX, steerY) > 0.08 && !dragging) notes.push({ level: "info", text: "Turning — tap to straighten" });
  if (speed >= 260) notes.push({ level: "alert", text: "Hand unsteady — slowing" });
  else if (cruise > MAX_CRUISE - 0.04) notes.push({ level: "info", text: "Flank speed" });
  else if (energy > 0.08) notes.push({ level: "info", text: "Diving" });
  if (!notes.length) notes.push({ level: "info", text: "Nose forward" });
  return notes.slice(0, 3);
}

function syncTale() {
  const line = currentTale();
  if (line !== shownTale) {
    shownTale = line;
    taleLine.textContent = line;
  }
  const sky = "This galaxy is called " + skyWord(base.h) + ".";
  if (sky !== shownSky) {
    shownSky = sky;
    skyLine.textContent = sky;
  }
  const notes = warningList();
  const key = notes.map(function (note) { return note.level + note.text; }).join("|");
  const warnBox = document.getElementById("warn");
  const pane = document.querySelector(".pane");
  if (warnBox && key !== shownWarn) {
    shownWarn = key;
    warnBox.textContent = "";
    for (let i = 0; i < notes.length; i++) {
      const row = document.createElement("p");
      row.className = notes[i].level;
      row.textContent = notes[i].text;
      warnBox.appendChild(row);
    }
  }
  if (pane) pane.classList.toggle("broken", blasting || crackLife > 0.2);
}

let fieldCanvas = null;
let fieldHue = -999;

function spikeStar(g, x, y, len, color) {
  const glow = g.createRadialGradient(x, y, 0, x, y, len * 0.45);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.95)");
  glow.addColorStop(0.18, "rgba(" + color.r + ", " + color.g + ", " + color.b + ", 0.45)");
  glow.addColorStop(1, "rgba(" + color.r + ", " + color.g + ", " + color.b + ", 0)");
  g.fillStyle = glow;
  g.beginPath();
  g.arc(x, y, len * 0.45, 0, Math.PI * 2);
  g.fill();

  g.lineCap = "round";
  g.strokeStyle = "rgba(" + color.r + ", " + color.g + ", " + color.b + ", 0.9)";
  g.lineWidth = 1.15;
  g.beginPath();
  g.moveTo(x - len, y);
  g.lineTo(x + len, y);
  g.moveTo(x, y - len * 0.82);
  g.lineTo(x, y + len * 0.82);
  g.stroke();

  g.strokeStyle = "rgba(255, 255, 255, 0.7)";
  g.lineWidth = 0.6;
  g.beginPath();
  g.moveTo(x - len * 1.35, y);
  g.lineTo(x + len * 1.35, y);
  g.moveTo(x, y - len * 1.15);
  g.lineTo(x, y + len * 1.15);
  g.stroke();

  g.fillStyle = "#ffffff";
  g.beginPath();
  g.arc(x, y, 1.7, 0, Math.PI * 2);
  g.fill();
}

function paintField(hue) {
  const w = Math.max(1, Math.floor(viewW));
  const h = Math.max(1, Math.floor(viewH));
  if (!fieldCanvas) fieldCanvas = document.createElement("canvas");
  fieldCanvas.width = w;
  fieldCanvas.height = h;
  const g = fieldCanvas.getContext("2d", { willReadFrequently: true });
  g.fillStyle = "#000000";
  g.fillRect(0, 0, w, h);

  for (let i = 0; i < 26; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    g.save();
    g.translate(x, y);
    g.rotate(Math.random() * Math.PI);
    g.scale(6 + Math.random() * 22, 1.4 + Math.random() * 3.2);
    const dust = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    dust.addColorStop(0, "rgba(186, 196, 214, 0.28)");
    dust.addColorStop(1, "rgba(186, 196, 214, 0)");
    g.fillStyle = dust;
    g.beginPath();
    g.arc(0, 0, 1, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  const image = g.getImageData(0, 0, w, h);
  const data = image.data;
  const tint = hslToRgb(hue, 35, 74);
  const count = Math.min(28000, Math.floor((w * h) / 38));
  for (let i = 0; i < count; i++) {
    const x = (Math.random() * w) | 0;
    const y = (Math.random() * h) | 0;
    const idx = (y * w + x) * 4;
    const roll = Math.random();
    let r;
    let gc;
    let b;
    if (roll < 0.07) {
      r = 150;
      gc = 190;
      b = 255;
    } else if (roll < 0.13) {
      r = 255;
      gc = 186;
      b = 120;
    } else {
      const v = 150 + Math.random() * 105;
      r = v;
      gc = v;
      b = Math.min(255, v + 8);
    }
    if (roll < 0.2) {
      r = r * 0.62 + tint.r * 0.38;
      gc = gc * 0.62 + tint.g * 0.38;
      b = b * 0.62 + tint.b * 0.38;
    }
    const shine = roll < 0.02 ? 255 : 50 + Math.random() * 205;
    data[idx] = r;
    data[idx + 1] = gc;
    data[idx + 2] = b;
    data[idx + 3] = shine;
  }
  g.putImageData(image, 0, 0);

  const heroes = [];
  const heroCount = 8 + Math.floor(Math.random() * 4);
  for (let i = 0; i < heroCount; i++) {
    let x = 0;
    let y = 0;
    let guard = 0;
    do {
      x = 50 + Math.random() * Math.max(1, w - 100);
      y = 40 + Math.random() * Math.max(1, h - 80);
      guard++;
    } while (guard < 12 && heroes.some(function (star) {
      return Math.hypot(star.x - x, star.y - y) < 140;
    }));
    heroes.push({ x: x, y: y });
    const palette = [
      { r: 170, g: 210, b: 255 },
      { r: 255, g: 186, b: 110 },
      { r: 255, g: 250, b: 245 },
      { r: 255, g: 160, b: 80 },
      { r: 150, g: 196, b: 255 }
    ];
    spikeStar(g, x, y, 28 + Math.random() * 46, palette[i % palette.length]);
  }
  fieldHue = hue;
}

function drawField(hue) {
  if (!fieldCanvas || Math.abs(fieldHue - hue) > 12) paintField(hue);
  ctx.drawImage(fieldCanvas, 0, 0, viewW, viewH);
}

function diveRate() {
  return (reduceMotion ? 0.45 : 1) * (0.04 + Math.pow(cruise, 1.25) * 1.05);
}

function crashRadius(body) {
  const span = Math.min(viewW, viewH);
  const full = span * 0.38;
  const reachable = body.r * 0.55 * 58;
  return Math.min(full, reachable * 0.9);
}

function approachBrake() {
  let brake = 1;
  let name = "";
  for (let i = 0; i < bodies.length; i++) {
    const body = bodies[i];
    const p = project(body.wx, body.wy, body.z);
    const radius = body.r * p.scale * 0.55;
    const dist = Math.hypot(p.x - focusX, p.y - focusY);
    if (radius < 42 || dist > radius * 1.05) continue;
    const goal = crashRadius(body);
    const ease = clamp((radius - 42) / Math.max(1, goal - 42), 0, 1);
    const next = lerp(0.8, 0.2, ease);
    if (next < brake) {
      brake = next;
      name = body.name === "Sun" ? "the Sun" : body.name;
    }
  }
  closingName = name;
  return brake;
}

function stickAxis(offset) {
  const dead = 0.06;
  const mag = Math.abs(offset);
  if (mag <= dead) return 0;
  const sign = offset < 0 ? -1 : 1;
  return sign * clamp((mag - dead) / (0.5 - dead), 0, 1);
}

function project(ox, oy, z) {
  const depth = Math.max(0.0028, z);
  const spread = 0.52 / depth;
  return {
    x: focusX + (ox - camX) * viewW * spread,
    y: focusY + (oy - camY) * viewH * spread,
    scale: clamp(0.2 / depth, 0.18, 72)
  };
}

function offscreen(p) {
  return p.x < -140 || p.y < -140 || p.x > viewW + 140 || p.y > viewH + 140;
}

function recycleBody(body, spread) {
  body.z = 0.88 + Math.random() * 0.12;
  body.ox = camX + (Math.random() * 2 - 1) * spread;
  body.oy = camY + (Math.random() * 2 - 1) * spread;
}

function stepBody(body, dt, rate, spread) {
  body.z -= rate * dt;
  if (body.z < 0.05) {
    recycleBody(body, spread);
    return;
  }
  if (body.z < 0.62 && offscreen(project(body.ox, body.oy, body.z))) {
    recycleBody(body, spread);
  }
}

function bodyHit(body) {
  const p = project(body.wx, body.wy, body.z);
  const radius = body.r * p.scale * 0.55;
  if (radius < crashRadius(body)) return false;
  return Math.hypot(p.x - focusX, p.y - focusY) < radius * 0.86;
}

function stepBodies(dt, rate) {
  for (let i = 0; i < bodies.length; i++) {
    const body = bodies[i];
    body.z -= rate * dt;
    body.spin += body.spinRate * dt;
    if (!blasting && bodyHit(body)) {
      const p = project(body.wx, body.wy, body.z);
      startBlast(body.name, p.x, p.y);
      return;
    }
    const p = project(body.wx, body.wy, body.z);
    if (body.z < 0.003 || (body.z < 0.45 && offscreen(p))) placeBody(body, true);
  }
}

function stepFlight(dt) {
  if (!focusReady || viewW < 2) return;
  const brake = blasting ? 1 : approachBrake();
  const rate = diveRate() * brake;
  for (let i = 0; i < dust.length; i++) stepBody(dust[i], dt, rate, 0.98);
  for (let i = 0; i < heroes.length; i++) stepBody(heroes[i], dt, rate, 0.72);
  for (let i = 0; i < smudges.length; i++) stepBody(smudges[i], dt, rate * 0.7, 0.85);
  stepBodies(dt, rate);
  const yaw = (0.05 + rate * 0.55) * dt;
  camX += steerX * yaw;
  camY += steerY * yaw;
}

function drawPlanet(kind, radius) {
  if (kind === "sun") {
    const glow = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius * 2.1);
    glow.addColorStop(0, "rgba(255, 250, 230, 0.95)");
    glow.addColorStop(0.35, "rgba(255, 190, 60, 0.75)");
    glow.addColorStop(1, "rgba(255, 120, 20, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff4cf";
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (kind === "comet") {
    const tail = ctx.createLinearGradient(0, 0, 0, radius * 4.4);
    tail.addColorStop(0, "rgba(255, 252, 245, 0.85)");
    tail.addColorStop(1, "rgba(170, 205, 255, 0)");
    ctx.fillStyle = tail;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.4, 0);
    ctx.lineTo(radius * 0.4, 0);
    ctx.lineTo(0, radius * 4.4);
    ctx.fill();
    ctx.fillStyle = "#f7fbff";
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2, radius * 0.48), 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const fill = {
    mercury: ["#8d847b", "#c4beb4"],
    venus: ["#c4a15a", "#f0ddb0"],
    earth: ["#2f6fbe", "#7eb6e8"],
    moon: ["#9aa3ad", "#e7eef3"],
    mars: ["#9a3d24", "#e07a55"],
    jupiter: ["#c47a3a", "#f3d7a1"],
    saturn: ["#d2b48c", "#f6e2bf"],
    uranus: ["#7fd6d2", "#d7fffb"],
    neptune: ["#243e9b", "#6d8ef0"],
    asteroid: ["#6d5846", "#c4b29b"]
  }[kind] || ["#888", "#ddd"];

  if (kind === "saturn") {
    ctx.save();
    ctx.rotate(-0.4);
    ctx.scale(1.7, 0.42);
    ctx.strokeStyle = "rgba(230, 210, 170, 0.85)";
    ctx.lineWidth = Math.max(2, radius * 0.16);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const shade = ctx.createRadialGradient(-radius * 0.35, -radius * 0.35, radius * 0.1, 0, 0, radius);
  shade.addColorStop(0, fill[1]);
  shade.addColorStop(1, fill[0]);
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  if (kind === "moon") {
    ctx.fillStyle = "rgba(70, 78, 88, 0.55)";
    ctx.beginPath();
    ctx.arc(-radius * 0.2, -radius * 0.15, radius * 0.28, 0, Math.PI * 2);
    ctx.arc(radius * 0.28, radius * 0.22, radius * 0.18, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "asteroid") {
    ctx.fillStyle = "rgba(40, 30, 22, 0.35)";
    ctx.beginPath();
    ctx.moveTo(-radius * 0.2, -radius * 0.85);
    ctx.lineTo(radius * 0.55, -radius * 0.2);
    ctx.lineTo(radius * 0.15, radius * 0.8);
    ctx.lineTo(-radius * 0.7, radius * 0.25);
    ctx.closePath();
    ctx.fill();
  } else if (kind === "earth") {
    ctx.fillStyle = "rgba(70, 150, 80, 0.85)";
    ctx.beginPath();
    ctx.ellipse(-radius * 0.15, -radius * 0.05, radius * 0.38, radius * 0.22, -0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "jupiter") {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(120, 60, 30, 0.45)";
    for (let band = -2; band <= 2; band++) {
      ctx.fillRect(-radius, band * radius * 0.28, radius * 2, radius * 0.1);
    }
    ctx.restore();
  } else if (kind === "saturn") {
    ctx.save();
    ctx.rotate(-0.4);
    ctx.scale(1.7, 0.42);
    ctx.strokeStyle = "rgba(255, 236, 205, 0.55)";
    ctx.lineWidth = Math.max(1.2, radius * 0.08);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawNose() {
  ctx.save();
  ctx.translate(focusX, focusY);
  ctx.rotate(heading);
  ctx.fillStyle = "rgba(255, 186, 90, 0.35)";
  ctx.beginPath();
  ctx.ellipse(-8, 0, 7, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff6e4";
  ctx.strokeStyle = "rgba(255, 220, 160, 0.95)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-8, 5.2);
  ctx.lineTo(-4.5, 0);
  ctx.lineTo(-8, -5.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBodies() {
  const order = bodies.slice().sort(function (a, b) { return b.z - a.z; });
  for (let i = 0; i < order.length; i++) {
    const body = order[i];
    const p = project(body.wx, body.wy, body.z);
    const radius = Math.max(1.6, body.r * p.scale * 0.55);
    if (radius < 1.5) continue;
    if (p.x < -radius * 2 || p.y < -radius * 2 || p.x > viewW + radius * 2 || p.y > viewH + radius * 2) continue;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (body.kind === "comet") {
      ctx.rotate(Math.atan2(p.y - focusY, p.x - focusX) + Math.PI / 2);
    } else {
      ctx.rotate(body.spin || 0);
    }
    drawPlanet(body.kind, radius);
    ctx.restore();
    if (radius > 14 && radius < Math.min(viewW, viewH) * 0.22) {
      ctx.fillStyle = "rgba(255, 248, 236, 0.82)";
      ctx.font = "12px Palatino, Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(body.name, p.x, p.y + radius + 16);
    }
  }
}

function dustColor(star) {
  const tint = hslToRgb(base.h, 30, 76);
  let r;
  let g;
  let b;
  if (star.kind < 0.08) {
    r = 160;
    g = 205;
    b = 255;
  } else if (star.kind < 0.15) {
    r = 255;
    g = 188;
    b = 120;
  } else {
    const v = 170 + star.bright * 80;
    r = v;
    g = v;
    b = Math.min(255, v + 8);
  }
  if (star.kind < 0.28) {
    r = r * 0.68 + tint.r * 0.32;
    g = g * 0.68 + tint.g * 0.32;
    b = b * 0.68 + tint.b * 0.32;
  }
  const alpha = 0.4 + star.bright * 0.6;
  return "rgba(" + (r | 0) + ", " + (g | 0) + ", " + (b | 0) + ", " + alpha.toFixed(3) + ")";
}

function drawFlight() {
  const rate = diveRate();
  ctx.lineCap = "round";

  for (let i = 0; i < smudges.length; i++) {
    const blob = smudges[i];
    const p = project(blob.ox, blob.oy, blob.z);
    if (offscreen(p)) continue;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(blob.rot);
    ctx.scale(blob.rw * p.scale * 0.32, blob.rh * p.scale * 0.32);
    const haze = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    haze.addColorStop(0, "rgba(196, 206, 224, 0.2)");
    haze.addColorStop(1, "rgba(196, 206, 224, 0)");
    ctx.fillStyle = haze;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (let i = 0; i < dust.length; i++) {
    const star = dust[i];
    const p = project(star.ox, star.oy, star.z);
    if (offscreen(p)) continue;
    const color = dustColor(star);
    const size = Math.max(0.7, (0.65 + star.bright) * Math.min(p.scale, 3));
    if (cruise > 0.14) {
      const prev = project(star.ox, star.oy, star.z + rate * (0.045 + cruise * 0.08));
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.min(2.6, size);
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(p.x, p.y, size, size);
    }
  }

  const palette = [
    { r: 170, g: 210, b: 255 },
    { r: 255, g: 186, b: 110 },
    { r: 255, g: 250, b: 245 },
    { r: 255, g: 160, b: 80 },
    { r: 150, g: 196, b: 255 }
  ];
  for (let i = 0; i < heroes.length; i++) {
    const hero = heroes[i];
    const p = project(hero.ox, hero.oy, hero.z);
    if (offscreen(p)) continue;
    spikeStar(ctx, p.x, p.y, hero.len * clamp(p.scale * 0.5, 0.32, 2.2), palette[hero.slot % palette.length]);
  }
  drawNose();
  drawBodies();
}

function drawVesper(redLevel, ignition, tremorLevel) {
  if (!pointer || !inside) return;
  const j = tremor(2.4, Math.pow(tremorLevel, 1.2) * 14, time);
  const x = emitX + j.x;
  const y = emitY + j.y;
  const color = waveColor(redLevel, ignition);
  const core = mixRgb(color, { r: 255, g: 250, b: 242 }, 0.7);
  const pulse = 1 + Math.sin(time * 3) * 0.08;
  const haloR = (22 + tremorLevel * 14) * pulse;
  const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR * 2.4);
  halo.addColorStop(0, rgba(color, 0.5));
  halo.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, haloR * 2.4, 0, Math.PI * 2);
  ctx.fill();

  const arm = 8 + ignition * 9 + tremorLevel * 4;
  const rot = time * 0.55;
  ctx.strokeStyle = rgba(core, 0.9);
  ctx.lineWidth = 1.15;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = rot + i * Math.PI / 2;
    ctx.moveTo(x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2);
    ctx.lineTo(x + Math.cos(a) * arm, y + Math.sin(a) * arm);
  }
  ctx.stroke();

  for (let i = 0; i < 3; i++) {
    const a = time * (1.15 - tremorLevel * 0.65) + i * (Math.PI * 2 / 3);
    const orbit = 16 + i * 4 - tremorLevel * 7;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * orbit, y + Math.sin(a) * orbit, 1.45, 0, Math.PI * 2);
    ctx.fillStyle = rgba(color, 0.85);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(x, y, 3.2 + tremorLevel * 2.2 + ignition * 3, 0, Math.PI * 2);
  ctx.fillStyle = rgba(core, 0.98);
  ctx.fill();
}

function drawRing(ring, redLevel, ignition, tremorLevel) {
  if (ring.age <= 0) return;
  const p = clamp(ring.age / ring.dur, 0, 1);
  const r = easeOutCubic(p) * ring.maxR;
  const fadeIn = Math.min(1, ring.age / 0.08);
  const fadeOut = 1 - smoothstep(0.5, 1, p);
  const alpha = fadeIn * fadeOut;
  const isBlast = ring.kind === "blast";
  const split = isBlast ? Math.min(1, p * 1.35) : smoothstep(0.9, 1, tremorLevel);
  const wobble = isBlast
    ? (reduceMotion ? 2 : 8) * (1 - p)
    : Math.min(18, Math.pow(smoothstep(0.32, 1, tremorLevel), 1.3) * (2.5 + r * 0.028));
  const jitterAmp = isBlast ? 0 : Math.pow(tremorLevel, 1.05) * (reduceMotion ? 5 : 22);
  const color = isBlast
    ? { r: 255, g: 246, b: 232 }
    : waveColor(redLevel, ignition);
  const copies = !isBlast && tremorLevel > 0.42 ? 2 : 1;

  for (let c = 0; c < copies; c++) {
    const j = tremor(ring.seed + c * 11, jitterAmp, time + c * 0.013);
    const copyAlpha = alpha * (copies === 1 ? 1 : 0.62);
    paintRing(
      ring.x + j.x,
      ring.y + j.y,
      r,
      color,
      copyAlpha * (isBlast ? 1 : 1),
      ring.width * (isBlast ? 1.4 : 1),
      ring.seed + c * 3,
      split,
      wobble
    );
  }
}

function draw() {
  const redLevel = smoothstep(0.04, 0.36, energy);
  const tremorLevel = Math.pow(smoothstep(0.14, 1, energy), 1.12);
  const ignition = smoothstep(0.9, 1, energy);
  const bg = backgroundColor(committed && blasting ? 0 : energy);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#000000";
  ctx.fillRect(-60, -60, viewW + 120, viewH + 120);
  drawFlight();

  const chargeShake = reduceMotion ? 0 : Math.pow(smoothstep(0.48, 1, tremorLevel), 2) * 15;
  const shake = tremor(4.2, chargeShake, time);
  const sx = shake.x + (Math.random() - 0.5) * shakeMag;
  const sy = shake.y + (Math.random() - 0.5) * shakeMag;
  ctx.translate(sx, sy);

  if (pointer && inside && redLevel > 0.02) {
    const radius = 70 + redLevel * 280;
    const glow = ctx.createRadialGradient(emitX, emitY, 0, emitX, emitY, radius);
    glow.addColorStop(0, "rgba(255, 34, 18, " + (0.08 + redLevel * 0.38) + ")");
    glow.addColorStop(0.42, "rgba(180, 8, 0, " + (0.04 + tremorLevel * 0.16) + ")");
    glow.addColorStop(1, "rgba(120, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(emitX, emitY, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < rings.length; i++) {
    if (rings[i].kind === "wave") drawRing(rings[i], redLevel, ignition, tremorLevel);
  }
  drawBridge(redLevel, ignition, tremorLevel);

  if (blasting && nextBase) {
    const p = clamp(blastT / 1.05, 0, 1);
    const cover = easeOutCubic(smoothstep(0, 0.62, p)) * Math.hypot(viewW, viewH) * 1.2;
    const bloom = ctx.createRadialGradient(blastX, blastY, 0, blastX, blastY, Math.max(1, cover));
    bloom.addColorStop(0, "rgba(255, 250, 242, 0.55)");
    bloom.addColorStop(0.28, "hsla(" + nextBase.h + ", " + nextBase.s + "%, 62%, 0.28)");
    bloom.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.beginPath();
    ctx.arc(blastX, blastY, Math.max(1, cover), 0, Math.PI * 2);
    ctx.fillStyle = bloom;
    ctx.fill();

    const rimAlpha = Math.max(0, 1 - p * 1.35);
    ctx.beginPath();
    ctx.arc(blastX, blastY, Math.max(1, cover - 1), 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, " + rimAlpha + ")";
    ctx.lineWidth = 3 + (1 - p) * 16;
    ctx.stroke();
  }

  for (let i = 0; i < rings.length; i++) {
    if (rings[i].kind === "blast") drawRing(rings[i], redLevel, 1, 1);
  }

  for (let i = 0; i < sparks.length; i++) {
    const spark = sparks[i];
    const len = Math.min(34, Math.hypot(spark.vx, spark.vy) * 0.028) * (0.35 + spark.life);
    const mag = Math.hypot(spark.vx, spark.vy) || 1;
    const dx = spark.vx / mag * len;
    const dy = spark.vy / mag * len;
    ctx.beginPath();
    ctx.moveTo(spark.x, spark.y);
    ctx.lineTo(spark.x - dx, spark.y - dy);
    const heat = Math.round(lerp(90, 255, spark.life));
    ctx.strokeStyle = "rgba(255, " + heat + ", " + Math.round(180 * spark.life) + ", " + spark.life + ")";
    ctx.lineWidth = spark.width * (0.6 + spark.life);
    ctx.stroke();
  }

  drawVesper(redLevel, ignition, tremorLevel);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (redLevel > 0.18) {
    const vignette = ctx.createRadialGradient(
      viewW * 0.5,
      viewH * 0.5,
      Math.min(viewW, viewH) * 0.2,
      viewW * 0.5,
      viewH * 0.5,
      Math.max(viewW, viewH) * 0.72
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(70, 0, 0, " + ((redLevel - 0.18) * 0.72) + ")");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, viewW, viewH);
  }

  if (flash > 0.01) {
    ctx.fillStyle = "rgba(255, 255, 255, " + (flash * 0.45) + ")";
    ctx.fillRect(0, 0, viewW, viewH);
  }

  drawCourseDrag();
  drawGlassBreak();
}

function shatter(x, y) {
  cracks.length = 0;
  const reach = Math.hypot(viewW, viewH);
  for (let i = 0; i < 18; i++) {
    cracks.push({
      x: x,
      y: y,
      a: (i / 18) * Math.PI * 2 + Math.random() * 0.35,
      len: 70 + Math.random() * reach * 0.62,
      bend: (Math.random() - 0.5) * 80
    });
  }
  crackLife = 1;
}

function drawCourseDrag() {
  if (!dragging) return;
  const dx = dragX - dragX0;
  const dy = dragY - dragY0;
  const len = Math.hypot(dx, dy);
  if (len < 10) return;
  const ship = { x: focusX, y: focusY };
  const reach = Math.min(168, len);
  const tipX = ship.x + (dx / len) * reach;
  const tipY = ship.y + (dy / len) * reach;
  ctx.save();
  ctx.strokeStyle = "rgba(255, 244, 220, 0.9)";
  ctx.fillStyle = "rgba(255, 244, 220, 0.9)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(ship.x, ship.y);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  const ang = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - Math.cos(ang - 0.4) * 12, tipY - Math.sin(ang - 0.4) * 12);
  ctx.lineTo(tipX - Math.cos(ang + 0.4) * 12, tipY - Math.sin(ang + 0.4) * 12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGlassBreak() {
  if (crackLife < 0.02 || !cracks.length) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, crackLife);
  ctx.lineCap = "round";
  for (let i = 0; i < cracks.length; i++) {
    const crack = cracks[i];
    const x2 = crack.x + Math.cos(crack.a) * crack.len;
    const y2 = crack.y + Math.sin(crack.a) * crack.len;
    const mx = (crack.x + x2) * 0.5 + Math.cos(crack.a + 1.4) * crack.bend;
    const my = (crack.y + y2) * 0.5 + Math.sin(crack.a + 1.4) * crack.bend;
    ctx.beginPath();
    ctx.moveTo(crack.x, crack.y);
    ctx.quadraticCurveTo(mx, my, x2, y2);
    ctx.strokeStyle = "rgba(236, 246, 255, 0.9)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(crack.x, crack.y);
    ctx.lineTo(mx, my);
    ctx.strokeStyle = "rgba(190, 220, 235, 0.35)";
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  ctx.restore();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  time += dt;
  update(dt, now);
  draw();
  syncTale();
  requestAnimationFrame(frame);
}

resize();
applyBackground(base);
window.addEventListener("resize", resize);
requestAnimationFrame(frame);
