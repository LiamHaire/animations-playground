// The meteor-impact explosion, drawn on a canvas as a pure function of u, the ms since impact. Shared by the standalone
// study (MeteorImpact.tsx) and the Patterns film.
//
// Visual language taken from a 2D FX reference (not its content): a sharp spike flash before anything is round, cel-shaded
// circular lobes that overshoot as they grow, dark smoke rolling in from the up-left until it covers every lit colour,
// then holes punching through until nothing is left.
//
// Drawn in a local frame: origin at the impact point, "up" (-y) pointing the way the blast is thrown. Callers place it with
// x/y, angle (radians, 0 = blast goes up the screen) and scale.

export const W = 1920;
export const H = 1080;

// Timeline, ms after impact
const SPIKE_MS = 260; // jagged flash before the fireball
const GROW_MS = 700; // lobe pop with overshoot
const SMOKE_AT = 750; // smoke holes start eating the fireball
const SMOKE_MS = 1100;
const COVER_AT = 1100; // soot spreads over all the lit colours
const COVER_MS = 450;
const CUT_AT = 2000; // then holes punch through until nothing is left
const CUT_MS = 1300;
const FADE_AT = 3500;
const FADE_MS = 700;
/** By now the cloud is solid soot: anything underneath it can be removed unseen. */
export const BLAST_COVERED_MS = 1800;
/** By now the frame is empty again. */
export const BLAST_MS = FADE_AT + FADE_MS;

export const C = {
  core: "#fffbe6",
  yellow: "#ffd43b",
  orange: "#ff8c1a",
  deep: "#e2441b",
  ember: "#b52d14",
  smoke: "#4a1d16",
  soot: "#24110e",
};

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const prog = (t: number, at: number, ms: number) => clamp((t - at) / ms);
export const easeOut = (x: number) => 1 - (1 - x) ** 3;
export const easeIn = (x: number) => x ** 2.6;
const easeInOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
const backOut = (x: number) => {
  const s = 2.2;
  return 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2;
};

export function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  if (r <= 0) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// Fireball lobes, relative to the impact point. A wide base hugging the ground, a rolling column, a heavier cap.
type Lobe = { x: number; y: number; r: number; d: number; rise: number; sx: number; sy: number; cx: number; cy: number };
const LOBES: Lobe[] = (() => {
  const R = rng(7);
  const out: Lobe[] = [];
  const add = (x: number, y: number, r: number, d: number, rise: number) =>
    out.push({ x, y, r, d, rise, sx: -0.28 + R() * 0.12, sy: -0.34 + R() * 0.1, cx: -0.12 + R() * 0.1, cy: -0.3 - R() * 0.1 });
  // base: wide, low, heavy
  for (let i = 0; i < 7; i++) {
    const s = i % 2 ? 1 : -1;
    const k = Math.ceil(i / 2);
    add(s * k * 120 + (R() - 0.5) * 40, -70 - R() * 30, 150 + R() * 40 - k * 14, 30 + k * 45, 0.25);
  }
  // column: fat and lumpy, lobes nearly as wide as the base
  for (let i = 0; i < 3; i++) add((i % 2 ? 1 : -1) * (30 + R() * 40), -210 - i * 95, 160 + R() * 30, 90 + i * 60, 0.6 + i * 0.12);
  // cap: big rolling mass
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (1.0 + (i / 4) * 1.0);
    add(Math.cos(a) * 230, -470 + Math.sin(a) * 120, 150 + R() * 50, 250 + R() * 120, 1.1);
  }
  add(20, -510, 200, 240, 1.15);
  return out;
})();

const SPIKES = (() => {
  const R = rng(3);
  return Array.from({ length: 11 }, (_, i) => {
    const a = Math.PI * (1.05 + (i / 10) * 0.9) + (R() - 0.5) * 0.15; // fanned up off the surface
    return { a, len: 300 + R() * 460, w: 0.13 + R() * 0.1 };
  });
})();

const EMBERS = (() => {
  const R = rng(11);
  return Array.from({ length: 46 }, () => {
    const a = Math.PI * (1.1 + R() * 0.8);
    const v = 0.35 + R() * 0.75;
    return { vx: Math.cos(a) * v, vy: Math.sin(a) * v, d: 150 + R() * 900, life: 1400 + R() * 1800, size: 2 + R() * 4 };
  });
})();

function drawSpike(ctx: CanvasRenderingContext2D, u: number) {
  const p = prog(u, 0, SPIKE_MS);
  if (p <= 0 || p >= 1) return;
  const s = easeOut(clamp(p / 0.35)) * (1 - easeIn(clamp((p - 0.45) / 0.55)));
  const star = (k: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    SPIKES.forEach(({ a, len, w }, i) => {
      const b = 70 * k;
      const x0 = Math.cos(a - w * 3) * b;
      const y0 = Math.sin(a - w * 3) * b;
      if (i === 0) ctx.moveTo(x0, y0);
      else ctx.lineTo(x0, y0);
      ctx.lineTo(Math.cos(a) * len * s * k, Math.sin(a) * len * s * k);
      ctx.lineTo(Math.cos(a + w * 3) * b, Math.sin(a + w * 3) * b);
    });
    ctx.lineTo(60 * k, 10);
    ctx.lineTo(-60 * k, 10);
    ctx.closePath();
    ctx.fill();
  };
  star(1, C.orange);
  star(0.72, C.yellow);
  star(0.42, C.core);
}

function drawShockwave(ctx: CanvasRenderingContext2D, u: number) {
  // Rings along the surface, seen edge on.
  const ring = (at: number, ms: number, maxR: number, width: number, color: string, alpha: number) => {
    const p = prog(u, at, ms);
    if (p <= 0 || p >= 1) return;
    ctx.save();
    ctx.globalAlpha = alpha * (1 - p ** 1.5);
    ctx.strokeStyle = color;
    ctx.lineWidth = width * (1 - p * 0.85);
    ctx.translate(0, 6);
    ctx.scale(1, 0.16);
    ctx.beginPath();
    ctx.arc(0, 0, maxR * easeOut(p), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };
  ring(60, 1500, 1500, 120, C.core, 0.95);
  ring(60, 1500, 1460, 70, C.yellow, 1);
  ring(260, 2000, 1250, 160, C.ember, 0.7); // dust skirt, slower and heavier
  // a pressure ring through the sky, very brief
  const p = prog(u, 30, 650);
  if (p > 0 && p < 1) {
    ctx.save();
    ctx.globalAlpha = (1 - p) * 0.55;
    ctx.strokeStyle = C.core;
    ctx.lineWidth = 18 * (1 - p);
    ctx.beginPath();
    ctx.arc(0, 0, 900 * easeOut(p), Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// fx already carries the local transform.
function drawFireball(fx: CanvasRenderingContext2D, u: number) {
  const u0 = u - SPIKE_MS * 0.5;
  if (u0 <= 0) return;
  const L = LOBES.map((l) => {
    const v = u0 - l.d;
    const g = v > 0 ? backOut(clamp(v / GROW_MS)) : 0;
    const drift = Math.max(0, v) * 0.03 * l.rise; // slow buoyant rise
    const swell = 1 + Math.max(0, v - GROW_MS) * 0.00012;
    return { ...l, X: l.x * (0.85 + 0.15 * g), Y: l.y * g - drift, R: l.r * g * swell };
  });
  const cool = easeInOut(prog(u, 350, 1200)); // core and yellow shrink as it cools
  // Body in cel bands; each band drawn for all lobes before the next so overlaps merge into one silhouette.
  for (const l of L) circle(fx, l.X, l.Y, l.R, C.deep);
  for (const l of L) circle(fx, l.X - l.R * 0.05, l.Y - l.R * 0.08, l.R * 0.9, C.orange);
  for (const l of L) circle(fx, l.X - l.R * 0.1, l.Y - l.R * 0.15, l.R * (0.74 - 0.34 * cool), C.yellow);
  for (const l of L) circle(fx, l.X - l.R * 0.16, l.Y - l.R * 0.22, l.R * (0.46 - 0.46 * cool), C.core);
  // Smoke holes, painted only onto the fireball (source-atop), offset up-left so the lower-right rim stays lit.
  fx.globalCompositeOperation = "source-atop";
  // Each hole slides in from the up-left edge while it grows, so smoke rolls across the lobe rather than popping up as a dot.
  const smoke = (l: (typeof L)[number], k: number, r: number, color: string) => {
    const s = easeOut(prog(u, SMOKE_AT + l.d * 0.6, SMOKE_MS));
    if (s <= 0) return;
    const o = (2.6 - 1.6 * s) * k;
    circle(fx, l.X + l.sx * l.R * o, l.Y + l.sy * l.R * o, l.R * r * (0.55 + 0.45 * s), color);
  };
  for (const l of L) smoke(l, 1, 1.12, C.ember);
  for (const l of L) smoke(l, 1.12, 0.98, C.smoke);
  // The soot core keeps spreading until it swallows every lit band, so the whole cloud goes dark.
  for (const l of L) {
    const s = easeOut(prog(u, SMOKE_AT + l.d * 0.6, SMOKE_MS));
    if (s <= 0) continue;
    const cv = easeInOut(prog(u, COVER_AT + l.d * 0.5, COVER_MS));
    const o = (2.6 - 1.6 * s) * 1.35 * (1 - cv);
    circle(fx, l.X + l.sx * l.R * o, l.Y + l.sy * l.R * o, l.R * (0.62 * (0.55 + 0.45 * s) * (1 - cv) + 1.3 * cv), C.soot);
  }
  // Punch-through: holes grow until they remove the dark cloud entirely, no rim left behind.
  fx.globalCompositeOperation = "destination-out";
  for (const l of L) {
    const c = easeInOut(prog(u, CUT_AT + l.d * 0.8, CUT_MS));
    circle(fx, l.X + l.cx * l.R, l.Y + l.cy * l.R, l.R * 1.6 * c, "#000");
  }
  fx.globalCompositeOperation = "source-over";
}

function drawEmbers(ctx: CanvasRenderingContext2D, u: number) {
  for (const e of EMBERS) {
    const v = u - e.d;
    if (v <= 0 || v > e.life) continue;
    const k = v / e.life;
    ctx.globalAlpha = (1 - k) * (0.6 + 0.4 * Math.sin(v * 0.03 + e.d));
    circle(ctx, e.vx * v, -120 + e.vy * v + 0.00012 * v * v, e.size * (1 - k * 0.5), k < 0.4 ? C.yellow : C.orange);
  }
  ctx.globalAlpha = 1;
}

export type BlastPlace = { x: number; y: number; angle: number; scale: number };

/** Red wash across the sky straight after impact (the only soft gradient, as in the reference). Draw it behind the scene. */
export function drawBloom(ctx: CanvasRenderingContext2D, u: number, { x, y }: BlastPlace, alpha = 1) {
  const bloom = prog(u, 0, 60) * (1 - easeOut(prog(u, 120, 1800))) * alpha;
  if (bloom <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, 1300);
  g.addColorStop(0, `rgba(255,96,40,${0.9 * bloom})`);
  g.addColorStop(0.5, `rgba(190,40,20,${0.45 * bloom})`);
  g.addColorStop(1, "rgba(120,20,10,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-60, -60, W + 120, H + 120);
}

/** Shockwave, fireball, spikes and embers. fx is a W x H scratch canvas. */
export function drawBlast(ctx: CanvasRenderingContext2D, fx: CanvasRenderingContext2D, u: number, at: BlastPlace) {
  if (u < 0 || u > BLAST_MS) return;
  const local = (c: CanvasRenderingContext2D) => {
    c.translate(at.x, at.y);
    c.rotate(at.angle);
    c.scale(at.scale, at.scale);
  };
  ctx.save();
  local(ctx);
  drawShockwave(ctx, u);
  ctx.restore();

  fx.setTransform(1, 0, 0, 1, 0, 0);
  fx.clearRect(0, 0, W, H);
  local(fx);
  drawFireball(fx, u);
  fx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1 - easeIn(prog(u, FADE_AT, FADE_MS));
  ctx.drawImage(fx.canvas, 0, 0);
  ctx.globalAlpha = 1;

  ctx.save();
  local(ctx);
  drawSpike(ctx, u);
  drawEmbers(ctx, u);
  ctx.restore();
}

export function scratchCanvas() {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  return c.getContext("2d")!;
}
