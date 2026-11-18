import { useEffect, useRef } from "react";
import { type ClipProps, play } from "../../play";
import { BLAST_MS, C as BC, H, W, circle, clamp, drawBlast, drawBloom, easeIn, prog, rng, scratchCanvas } from "./blast";

// Meteor impact study, drawn on a 1920x1080 canvas. Every frame is a pure function of time t (ms), and t is read from a
// WAAPI clock on the canvas so speed, Replay and scripts/render.mjs (which pauses and seeks animations) all work.
// The explosion itself lives in blast.ts so the Patterns film draws the same thing.

// Timeline (ms)
const METEOR_AT = 500; // meteor enters
const IMPACT = 2100; // contact
const TOTAL = IMPACT + BLAST_MS + 300;

// Earth: a big curved horizon, impact on its crest.
const EARTH = { x: 960, y: 820 + 1900, r: 1900 };
const HIT = { x: 960, y: 820 };
const METEOR_FROM = { x: 1980, y: -140 };

const C = {
  ...BC,
  space: "#070a14",
  seaDark: "#0f2c5c",
  sea: "#1d4f91",
  seaLit: "#3478c6",
  land: "#2f7d6b",
  landLit: "#4fa58a",
  atmo: "#7cc4ff",
};

const STARS = (() => {
  const R = rng(19);
  return Array.from({ length: 140 }, () => ({ x: R() * W, y: R() * H * 0.75, s: R() < 0.1 ? 2.4 : 1.2, a: 0.25 + R() * 0.6 }));
})();

const ROCK = (() => {
  const R = rng(5);
  return Array.from({ length: 11 }, (_, i) => {
    const a = (i / 11) * Math.PI * 2;
    return [Math.cos(a) * (1 + (R() - 0.5) * 0.35), Math.sin(a) * (1 + (R() - 0.5) * 0.35)] as const;
  });
})();

function drawEarth(ctx: CanvasRenderingContext2D, t: number) {
  const { x, y, r } = EARTH;
  // atmosphere halo
  ctx.save();
  ctx.globalAlpha = 0.35;
  circle(ctx, x, y, r + 26, C.atmo);
  ctx.globalAlpha = 0.6;
  circle(ctx, x, y, r + 10, C.atmo);
  ctx.restore();
  circle(ctx, x, y, r, C.seaDark);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  circle(ctx, x - 160, y + 40, r - 30, C.sea); // hard cel band: lit from the upper left
  circle(ctx, x - 420, y + 120, r - 200, C.seaLit);
  // land masses as lumpy circle clusters
  const lands: [number, number, number][] = [
    [380, 800, 120], [470, 790, 90], [300, 830, 100], [1440, 820, 140], [1560, 800, 100], [1330, 860, 90], [880, 900, 80], [1010, 920, 70],
  ];
  for (const [lx, ly, lr] of lands) circle(ctx, lx, ly, lr, C.land);
  for (const [lx, ly, lr] of lands) circle(ctx, lx - lr * 0.18, ly - lr * 0.2, lr * 0.72, C.landLit);
  // impact glow on the surface, gone by the time the smoke has covered everything
  const g = prog(t, IMPACT, 40) * (1 - prog(t, IMPACT + 300, 2000));
  if (g > 0) {
    ctx.save();
    ctx.globalAlpha = g;
    ctx.translate(HIT.x, HIT.y);
    ctx.scale(1, 0.22);
    circle(ctx, 0, 0, 520, C.deep);
    circle(ctx, 0, 0, 340, C.orange);
    circle(ctx, 0, 0, 170, C.yellow);
    ctx.restore();
  }
  ctx.restore();
}

function drawMeteor(ctx: CanvasRenderingContext2D, t: number) {
  const p = prog(t, METEOR_AT, IMPACT - METEOR_AT);
  if (p <= 0 || p >= 1) return;
  const e = easeIn(p);
  const hx = METEOR_FROM.x + (HIT.x - METEOR_FROM.x) * e;
  const hy = METEOR_FROM.y + (HIT.y - METEOR_FROM.y) * e;
  const ang = Math.atan2(HIT.y - METEOR_FROM.y, HIT.x - METEOR_FROM.x);
  const speed = 2.6 * p ** 1.6; // matches easeIn derivative shape
  const len = 160 + 900 * speed; // trail stretches as it accelerates (smear)
  const flick = Math.sin(t * 0.06) * 0.06 + Math.sin(t * 0.13) * 0.04;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(ang);
  // cel-banded trail: tapered teardrops behind the head
  const band = (l: number, w: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-l, 0);
    ctx.quadraticCurveTo(-l * 0.35, -w * (1 + flick), 0, -w);
    ctx.arc(0, 0, w, -Math.PI / 2, Math.PI / 2);
    ctx.quadraticCurveTo(-l * 0.35, w * (1 - flick), -l, 0);
    ctx.fill();
  };
  band(len, 62, C.deep);
  band(len * 0.78, 50, C.orange);
  band(len * 0.52, 38, C.yellow);
  band(len * 0.25, 26, C.core);
  // speed lines
  ctx.strokeStyle = C.yellow;
  ctx.lineCap = "round";
  for (let i = 0; i < 5; i++) {
    const o = ((t * 0.9 + i * 137) % 400) / 400;
    ctx.globalAlpha = (1 - o) * 0.8;
    ctx.lineWidth = 4;
    const off = (i - 2) * 34;
    ctx.beginPath();
    ctx.moveTo(-80 - o * len, off);
    ctx.lineTo(-80 - o * len - 140 * speed - 40, off);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // rock: dark body, molten leading face
  const rock = (s: number, dx: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ROCK.forEach(([px, py], i) => (i ? ctx.lineTo(dx + px * s, py * s) : ctx.moveTo(dx + px * s, py * s)));
    ctx.fill();
  };
  rock(40, 0, C.orange);
  rock(36, -6, C.smoke);
  rock(24, -12, C.soot);
  ctx.restore();
}

const PLACE = { x: HIT.x, y: HIT.y, angle: 0, scale: 1 };

function draw(ctx: CanvasRenderingContext2D, fx: CanvasRenderingContext2D, t: number, reduced: boolean) {
  const u = t - IMPACT;
  ctx.save();
  // camera shake, decaying after impact
  const sh = reduced || u <= 0 ? 0 : 26 * (1 - clamp(u / 900));
  if (sh > 0) ctx.translate(Math.sin(t * 0.9) * sh, Math.cos(t * 1.3) * sh * 0.6);
  ctx.fillStyle = C.space;
  ctx.fillRect(-60, -60, W + 120, H + 120);
  for (const s of STARS) {
    ctx.globalAlpha = s.a;
    circle(ctx, s.x, s.y, s.s, "#dbe4ff");
  }
  ctx.globalAlpha = 1;
  drawBloom(ctx, u, PLACE);
  drawEarth(ctx, t);
  drawMeteor(ctx, t);
  drawBlast(ctx, fx, u, PLACE);
  // one-frame white flash on contact
  if (!reduced && u >= 0 && u < 50) {
    ctx.fillStyle = "rgba(255,255,240,0.85)";
    ctx.fillRect(-60, -60, W + 120, H + 120);
  }
  ctx.restore();
}

export function MeteorImpact({ runKey, speed, reduced }: ClipProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const fx = scratchCanvas();
    const anims: Animation[] = [];
    const clock = play(canvas, [{ opacity: 1 }, { opacity: 1 }], { duration: TOTAL, easing: "linear" }, speed, anims);
    let raf = 0;
    const tick = () => {
      const t = Math.min(TOTAL, (Number(clock.currentTime) || 0) * speed);
      draw(ctx, fx, t, reduced);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      anims.forEach((a) => a.cancel());
    };
  }, [runKey, speed, reduced]);
  return <canvas ref={ref} width={W} height={H} className="absolute inset-0 h-full w-full object-cover" />;
}
