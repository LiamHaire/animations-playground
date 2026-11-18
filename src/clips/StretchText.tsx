import { useEffect, useRef } from "react";
import { BREATHE_EASE, type ClipProps, type Go, SPRING, cq, goFor, spring, springEase } from "../play";
import { BounceText } from "./BounceTitle";

// Letters stretching out into outlined shapes (from the Patterns title card): each letter's ink is scaled and moved onto
// its shape's box, overshooting a touch, while the outline takes over. Then, optionally, the row breathes out and springs
// shut into one circle in the middle. Transforms and opacity only, no blur, so nothing repaints.

export type Box = { l: number; t: number; w: number; h: number };
// An element's untransformed layout box, to the fraction of a pixel. offsetLeft and friends round to whole pixels, which
// knocks anything centred on them off by up to a pixel. Px set inline (by fitShapes, fitBox) is read as set, since a
// computed value would include any animation running on it; anything else comes from the computed style.
const num = (v: string) => (v.endsWith("px") ? parseFloat(v) : NaN);
export function layoutBox(el: HTMLElement): Box {
  const cs = getComputedStyle(el);
  const pick = (k: "left" | "top" | "width" | "height") => { const v = num(el.style[k]); return Number.isNaN(v) ? parseFloat(cs[k]) || 0 : v; };
  return { l: pick("left"), t: pick("top"), w: pick("width"), h: pick("height") };
}
// round: a circle as tall as the letters. half: half the width of the others (an I or an l).
export type ShapeKind = { round?: boolean; half?: boolean };
// A guess from the letter itself, for when the caller doesn't say.
export const shapeFor = (c: string): ShapeKind => (/[OoQ0@]/.test(c) ? { round: true } : /[Iil1|!.,:;']/.test(c) ? { half: true } : {});

export const MORPH_MS = 214; // half a beat at 140bpm: stretching out, then handing over to its shape
export const MORPH_HANDOVER = 0.5; // how far into its morph the letter fills its shape's box

// Sizes each shape to the ink of its letter, in the letter's own (untransformed) layout box. Circles are true circles, as
// tall as the letters. The row keeps the word's overall width: the gaps narrow evenly to make room for the circles, then
// are evened out within each word (the word space keeps its own scaled gap) at `gap` of the even letter spacing. The
// rectangles share what's left, all one width except the half ones.
export function fitShapes(letters: HTMLElement[], blocks: HTMLElement[], shapes: ShapeKind[], gap = 0.5) {
  const ctx = document.createElement("canvas").getContext("2d")!;
  const ink = letters.map((l) => {
    ctx.font = getComputedStyle(l).font;
    const m = ctx.measureText(l.textContent!);
    const baseline = (l.offsetHeight - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
    const left = l.offsetLeft - m.actualBoundingBoxLeft;
    return { left, right: left + m.actualBoundingBoxLeft + m.actualBoundingBoxRight, top: l.offsetTop + baseline - m.actualBoundingBoxAscent, h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent };
  });
  const h = Math.max(...ink.map((k) => k.h));
  const top = Math.min(...ink.map((k) => k.top));
  const span = ink[ink.length - 1].right - ink[0].left;
  const circles = ink.reduce((a, _, i) => a + (shapes[i]?.round ? h : 0), 0);
  const rest = span - ink.reduce((a, k, i) => a + (shapes[i]?.round ? k.right - k.left : 0), 0);
  const k = (span - circles) / rest;
  const raw = ink.slice(1).map((m, i) => (m.left - ink[i].right) * k);
  // The gap across a word space, if the gaps are uneven enough to have one.
  const widest = Math.max(...raw);
  const space = raw.length > 1 && widest > 2 * Math.min(...raw) ? raw.indexOf(widest) : -1;
  const inner = raw.filter((_, i) => i !== space);
  const even = inner.length ? (inner.reduce((a, g) => a + g, 0) / inner.length) * gap : 0; // tighter than the letters, so the rectangles get wider
  const gaps = raw.map((g, i) => (i === space ? g : even));
  const units = ink.reduce((a, _, i) => a + (shapes[i]?.round ? 0 : shapes[i]?.half ? 0.5 : 1), 0);
  const rect = (span - circles - gaps.reduce((a, g) => a + g, 0)) / units;
  const widths = ink.map((_, i) => (shapes[i]?.round ? h : shapes[i]?.half ? rect / 2 : rect));
  let x = ink[0].left;
  return ink.map((k, i) => {
    const b = blocks[i];
    if (b) Object.assign(b.style, { left: `${x}px`, top: `${top}px`, width: `${widths[i]}px`, height: `${h}px` });
    const fit = { ink: { l: k.left, t: k.top, w: k.right - k.left, h: k.h }, box: { l: x, t: top, w: widths[i], h } };
    x += widths[i] + (gaps[i] ?? 0);
    return fit;
  });
}

// Fits a box to the ink of the text inside `root` (its deepest text element). Offsets are summed up to `root`
// (untransformed layout, so a roll or bounce doesn't throw it off); the box is drawn outside the ink, its border on top of it.
export function fitBox(root: HTMLElement, box: HTMLElement) {
  const text = [...root.querySelectorAll<HTMLElement>("*")].reverse().find((e) => e.textContent!.trim() && !e.children.length);
  if (!text) return;
  let x = 0, y = 0;
  for (let e: HTMLElement | null = text; e && e !== root; e = e.offsetParent as HTMLElement | null) {
    x += e.offsetLeft;
    y += e.offsetTop;
  }
  const cs = getComputedStyle(text);
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.font = cs.font;
  ctx.letterSpacing = cs.letterSpacing;
  const m = ctx.measureText(text.textContent!);
  const baseline = (text.offsetHeight - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
  const pad = parseFloat(getComputedStyle(box).borderTopWidth) * 2; // a little air between the ink and the border
  const ink = { l: x - m.actualBoundingBoxLeft, t: y + baseline - m.actualBoundingBoxAscent,
    w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight, h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent };
  Object.assign(box.style, { left: `${ink.l - pad}px`, top: `${ink.t - pad}px`, width: `${ink.w + pad * 2}px`, height: `${ink.h + pad * 2}px` });
  return { ink, box: { l: ink.l - pad, t: ink.t - pad, w: ink.w + pad * 2, h: ink.h + pad * 2 } };
}

// A letter (or word) stretching out to fill its shape's box. `ink` and `box` are in the same coordinates; the element's
// transform origin is put at its ink's top left, so the scale maps one onto the other. `own` is the element's own offset.
export function stretchInto(el: HTMLElement, outline: HTMLElement, ink: Box, box: Box, own: { l: number; t: number },
  at: number, t0: CSSNumberish | null, speed: number, reduced: boolean, anims: Animation[],
  { ms = MORPH_MS, handover = MORPH_HANDOVER }: { ms?: number; handover?: number } = {}) {
  // "forwards": filling backwards would hold the letter at full opacity before it has come in.
  const go = goFor(speed, reduced, anims, t0);
  if (reduced) {
    go(el, [{ opacity: 1 }, { opacity: 0 }], at, 1);
    go(outline, [{ opacity: 0 }, { opacity: 1 }], at, 1);
    return;
  }
  el.style.transformOrigin = `${ink.l - own.l}px ${ink.t - own.t}px`;
  const sx = box.w / ink.w, sy = box.h / ink.h, dx = box.l - ink.l, dy = box.t - ink.t;
  const to = (k: number) => `translate(${dx * k}px, ${dy * k}px) scale(${1 + (sx - 1) * k}, ${1 + (sy - 1) * k})`;
  go(el, [
    { transform: to(0), opacity: 1, offset: 0, easing: "cubic-bezier(0.5, 0, 0.75, 0)" },
    { transform: to(1.06), opacity: 1, offset: handover, easing: "cubic-bezier(0.2, 0.7, 0.4, 1)" },
    { transform: to(1), opacity: 0, offset: Math.min(1, handover + 0.25) },
    { transform: to(1), opacity: 0, offset: 1 },
  ], at, ms);
  // The outline arrives as the letter fills it, slightly big (matching its overshoot), and settles to size.
  go(outline, [
    { opacity: 0, scale: "1.06", offset: 0 },
    { opacity: 0, scale: "1.06", offset: handover - 0.1, easing: "ease-out" },
    { opacity: 1, scale: "1.04", offset: handover + 0.05, easing: "cubic-bezier(0.2, 0.7, 0.4, 1)" },
    { opacity: 1, scale: "1", offset: 1 },
  ], at, ms);
}

export type SnapOptions = {
  breatheAt: number;
  breatheMs: number;
  snapMs: number;
  spread?: number; // each shape drifts this fraction of its distance from the row's centre further out as it breathes
};
// The row breathes out (gathering speed), then springs shut into one circle at `mid` (px, in the shapes' coordinates),
// the others shrinking and fading into it as they converge, the further out the sooner. Returns the one left showing.
export function breatheSnap(go: Go, blocks: HTMLElement[], shapes: ShapeKind[], mid: number, { breatheAt, breatheMs, snapMs, spread = 0.15 }: SnapOptions) {
  const px = (n: number) => `${n}px`;
  const snapAt = breatheAt + breatheMs;
  const rows = blocks.map(layoutBox);
  const h = Math.max(...rows.map((r) => r.h));
  const rowC = (rows[0].l + rows[rows.length - 1].l + rows[rows.length - 1].w) / 2;
  const centre = Math.round((rows.length - 1) / 2);
  blocks.forEach((b, i) => {
    const { l, w } = rows[i];
    const c = l + w / 2;
    const out = c + (c - rowC) * spread;
    const radius = shapes[i]?.round ? "50%" : "0%";
    go(b, [{ left: px(l), width: px(w), borderRadius: radius }, { left: px(out - w / 2), width: px(w), borderRadius: radius }],
      breatheAt, breatheMs, BREATHE_EASE);
    const xs = spring(out, mid, 0.06);
    const ws = spring(w, h, 0.12, 0.7);
    go(b, SPRING.map((o, k) => ({ offset: o, left: px(xs[k] - ws[k] / 2), width: px(ws[k]), borderRadius: k ? "50%" : radius, ...springEase(k) })),
      snapAt, snapMs);
    if (i !== centre) {
      const far = Math.abs(i - centre) / Math.max(centre, rows.length - 1 - centre);
      go(b, [{ opacity: 1, scale: "1" }, { opacity: 0, scale: "0.5" }], snapAt + snapMs * (0.3 - far * 0.2), snapMs * 0.35, "cubic-bezier(0.4, 0, 1, 1)");
    }
  });
  return blocks[centre];
}

type StretchTextProps = ClipProps & {
  text?: string;
  shapes?: ShapeKind[]; // one per letter, spaces skipped; guessed from the letters if not given
  at?: number; // when the first letter starts stretching
  stagger?: number; // between letters
  ms?: number;
  snap?: boolean; // then breathe and spring shut into one circle
  color?: string;
  stroke?: number; // outline width, px in a 1920-wide frame
  font?: string; // classes for the word
};

// The word bounces in, holds, then stretches into its shapes (and snaps into a circle).
export function StretchText({ runKey, speed, reduced, text = "BLOCKS", shapes, at = 1400, stagger = 40, ms = MORPH_MS * 1.4,
  snap = false, color = "var(--stage-fg)", stroke = 4, font = "font-geist font-light whitespace-nowrap leading-normal text-[8cqw] tracking-[1cqw]" }: StretchTextProps) {
  const word = useRef<HTMLDivElement>(null);
  const outlines = useRef<HTMLDivElement>(null);
  const kinds = shapes ?? [...text].filter((c) => c.trim()).map(shapeFor);

  useEffect(() => {
    let built: Animation[] = [];
    const clock: Animation[] = [];
    // The shared timeline origin, so a refit (fonts loading, resize) rebuilds the morph in step.
    const t = word.current!.animate([{ opacity: 1 }, { opacity: 1 }], { duration: 1 });
    clock.push(t);
    const fit = () => {
      built.forEach((a) => a.cancel());
      built = [];
      const letters = [...word.current!.querySelectorAll<HTMLElement>("[data-c]")].filter((c) => c.textContent!.trim());
      const blocks = [...outlines.current!.children] as HTMLElement[];
      const fits = fitShapes(letters, blocks, kinds);
      letters.forEach((l, i) => {
        if (blocks[i]) stretchInto(l, blocks[i], fits[i].ink, fits[i].box, { l: l.offsetLeft, t: l.offsetTop },
          at + i * stagger, t.startTime, speed, reduced, built, { ms });
      });
      if (snap) {
        const end = at + (letters.length - 1) * stagger + ms;
        // The middle of the row of shapes, which is centred in the stage.
        const first = layoutBox(blocks[0]), last = layoutBox(blocks[blocks.length - 1]);
        const mid = (first.l + last.l + last.w) / 2;
        breatheSnap(goFor(speed, reduced, built, t.startTime), blocks, kinds, mid, { breatheAt: end + 200, breatheMs: 260, snapMs: 260 });
      }
    };
    fit();
    document.fonts.ready.then(fit);
    return () => {
      built.forEach((a) => a.cancel());
      clock.forEach((a) => a.cancel());
    };
  }, [runKey, speed, reduced, text, at, stagger, ms, snap]);

  return (
    <div ref={word} className="relative">
      <BounceText runKey={runKey} speed={speed} reduced={reduced} text={text} startDelay={300} color={color} className={font} />
      <div ref={outlines} className="pointer-events-none absolute inset-0" aria-hidden>
        {kinds.map((s, i) => (
          <div key={i} className="absolute box-border opacity-0" style={{ border: `${cq(stroke)} solid ${color}`, borderRadius: s.round ? "50%" : 0 }} />
        ))}
      </div>
    </div>
  );
}
