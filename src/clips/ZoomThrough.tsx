import { type ReactNode, useEffect, useRef } from "react";
import { type ClipProps, cq, play } from "../play";

// Zoom out to a planet (worked out for the Patterns film, jungle to Earth). It opens on a long, wide frame (letterboxed
// to frameAspect), which pulls back into space: the rectangle shrinks and rounds off into a circle, and that circle is
// the planet. Inside it, the frame's content keeps
// zooming out faster than the circle shrinks, so more of it comes into view, while the planet's own design fades in over
// it. Stars fade in behind and speed streaks rush out from the middle.
//
// The window (the frame's outline) and the content are two separate moves on one eased curve, sampled into keyframes so
// they can't drift apart: the window shrinks to the planet, the content much further.
export const ZOOM_MS = 1200;

type ZoomThroughProps = ClipProps & {
  from?: ReactNode; // the frame's content, centred; it can be bigger than the frame (a panorama) to reveal as it pulls back
  planet?: ReactNode; // the planet's design, filling a planetSize box; any [data-planet-lines] inside inks in last
  space?: ReactNode; // behind everything; fades in round the shrinking frame
  at?: number;
  duration?: number;
  planetSize?: number; // diameter, px in a 1920-wide frame
  frameAspect?: number; // the starting frame's width to height: wider than the stage letterboxes it (2.39 is cinema scope)
  contentEnd?: number; // the content's scale at the end; by default a 3-frame-tall panorama's height fills the planet
  round?: readonly [number, number]; // progress (0 to 1) over which the rectangle rounds off into a circle
  planetIn?: readonly [number, number]; // ...the planet's design fades in (the content fades out after it)
  linesIn?: readonly [number, number]; // ...the planet's outlines ink in
  starsIn?: readonly [number, number]; // ...the stars fade in
  streaks?: number; // 0 for none
  streakColor?: string;
};

const range = (p: number, [a, b]: readonly [number, number]) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const smooth = (k: number) => k * k * (3 - 2 * k);
const easeInOut = (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);

export function ZoomThrough({
  runKey, speed, reduced, from, planet, space, at = 800, duration = ZOOM_MS, planetSize = 382, frameAspect = 2.39, contentEnd,
  round = [0.3, 0.7], planetIn = [0.55, 0.85], linesIn = [0.85, 1], starsIn = [0.15, 0.6], streaks = 16, streakColor = "#fff",
}: ZoomThroughProps) {
  const root = useRef<HTMLDivElement>(null);
  const stars = useRef<HTMLDivElement>(null);
  const win = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const globe = useRef<HTMLDivElement>(null);
  const lines = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anims: Animation[] = [];
    const opts = { duration, delay: at, easing: "linear", fill: "forwards" as FillMode };
    const planetLines = globe.current!.querySelector("[data-planet-lines]");
    if (reduced) {
      const fade = { ...opts, duration: 400, easing: "ease" };
      play(content.current!, [{ opacity: 1 }, { opacity: 0 }], fade, speed, anims);
      play(globe.current!, [{ opacity: 0 }, { opacity: 1 }], { ...fade, fill: "both" }, speed, anims);
      play(stars.current!, [{ opacity: 0 }, { opacity: 1 }], { ...fade, fill: "both" }, speed, anims);
      if (planetLines) play(planetLines, [{ opacity: 1 }, { opacity: 1 }], { ...fade, fill: "both" }, speed, anims);
      play(win.current!, [{ clipPath: "none" }, { clipPath: "none" }], fade, speed, anims);
      return () => anims.forEach((a) => a.cancel());
    }
    // The starting frame: the stage's width, letterboxed to frameAspect (or the stage's own height, if that's wider).
    const SW = root.current!.clientWidth, SH = root.current!.clientHeight;
    const W = SW, H = Math.min(SH, SW / frameAspect);
    const R = (planetSize / 2) * (SW / 1920) * 1.005; // the window lands on the planet's edge (a hair outside, for its outline)
    const sEnd = R / (H / 2); // the window's shrink: its height lands on the planet's diameter
    const cy = SH / 2; // the frame is centred in the stage
    // By default the content ends with a 3-frame-tall panorama's height filling the planet, so its edges never show in it.
    const cEnd = contentEnd ?? planetSize / (3 * 1080);
    const STEPS = 48;
    const winFrames: Keyframe[] = [], contentFrames: Keyframe[] = [], globeFrames: Keyframe[] = [];
    for (let i = 0; i <= STEPS; i++) {
      const p = i / STEPS, e = easeInOut(p);
      // Both on a log scale, so each stretch of the pull-back looks the same.
      const s = Math.exp(Math.log(sEnd) * e), c = Math.exp(Math.log(cEnd) * e);
      const m = smooth(range(p, round)); // 0 a rectangle, 1 a circle
      const hh = (H / 2) * s;
      const hw = (W / 2) * s * (1 - m) + hh * m; // the frame's width comes in to match its height as it rounds
      winFrames.push({ offset: p, clipPath: `inset(${cy - hh}px ${SW / 2 - hw}px ${SH - cy - hh}px ${SW / 2 - hw}px round ${hh * m}px)` });
      // The content gives way as the planet comes in, a little behind it, so the two cross-fade rather than stack.
      const handover = [(planetIn[0] + planetIn[1]) / 2, Math.min(1, planetIn[1] + 0.05)] as const;
      contentFrames.push({ offset: p, transform: `scale(${c})`, opacity: 1 - smooth(range(p, handover)) });
      globeFrames.push({ offset: p, transform: `scale(${hh / R})`, opacity: smooth(range(p, planetIn)) });
    }
    // Letterboxed from the start, held there until the zoom.
    play(win.current!, winFrames, { ...opts, fill: "both" }, speed, anims);
    play(content.current!, contentFrames, opts, speed, anims);
    play(globe.current!, globeFrames, opts, speed, anims);
    if (planetLines) {
      play(planetLines, [{ opacity: 0 }, { opacity: 0, offset: linesIn[0] }, { opacity: 1, offset: linesIn[1] }, { opacity: 1 }], { ...opts, easing: "ease-out" }, speed, anims);
    }
    // The stars drift in from a little bigger, slower than the frame: they're further away.
    play(stars.current!, [
      { opacity: 0, transform: "scale(1.4)", offset: 0 },
      { opacity: 0, offset: starsIn[0] },
      { opacity: 1, offset: starsIn[1] },
      { opacity: 1, transform: "scale(1)", offset: 1 },
    ], { ...opts, easing: "cubic-bezier(0.3, 0, 0.3, 1)" }, speed, anims);
    lines.current!.querySelectorAll<HTMLElement>("[data-streak]").forEach((el, i) => {
      play(el, [
        { opacity: 0, transform: `rotate(${el.dataset.a}deg) translateX(${cq(30)}) scaleX(0.2)` },
        { opacity: 0.9, transform: `rotate(${el.dataset.a}deg) translateX(${cq(300)}) scaleX(1)`, offset: 0.4 },
        { opacity: 0, transform: `rotate(${el.dataset.a}deg) translateX(${cq(1300)}) scaleX(1.6)` },
      ], { duration: duration * 0.6, delay: at + duration * 0.2 + (i % 5) * 40, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" }, speed, anims);
    });
    return () => anims.forEach((a) => a.cancel());
  }, [runKey, speed, reduced, at, duration, planetSize, frameAspect, contentEnd, round[0], round[1], planetIn[0], planetIn[1], linesIn[0], linesIn[1], starsIn[0], starsIn[1], streaks]);

  return (
    <div ref={root} className="absolute inset-0 overflow-hidden" style={{ background: "#0a0a0a" }}>
      <div ref={stars} className="absolute inset-0 opacity-0">{space ?? <DemoStars />}</div>
      {/* The window: the frame's outline, clipped from the full frame down to the planet. */}
      <div ref={win} className="absolute inset-0">
        <div ref={content} className="absolute inset-0">{from ?? <DemoPanorama />}</div>
        <div ref={globe} className="absolute opacity-0"
          style={{ left: "50%", top: "50%", width: cq(planetSize), height: cq(planetSize), translate: "-50% -50%" }}>
          {planet ?? <DemoPlanet />}
        </div>
      </div>
      <div ref={lines} className="pointer-events-none absolute inset-0" aria-hidden>
        {Array.from({ length: streaks }, (_, i) => (
          <div key={i} data-streak data-a={(i * 360) / streaks + (i % 3) * 7} className="absolute opacity-0"
            style={{ left: "50%", top: "50%", width: cq(160 + (i % 4) * 60), height: cq(3), transformOrigin: "0 50%", borderRadius: cq(2), background: streakColor }} />
        ))}
      </div>
    </div>
  );
}

// The demo uses the Patterns film's own pieces, so it can be judged for the film as it is.
// The jungle in its surroundings: bg-wide.svg is three frames by three, the scene in the middle.
function DemoPanorama() {
  return <img src="/patterns/bg-wide.svg" alt="" className="absolute max-w-none" style={{ left: "50%", top: "50%", width: "300%", translate: "-50% -50%" }} />;
}
function DemoPlanet() {
  return (
    <>
      <img src="/patterns/earth-fill.svg" alt="" className="absolute inset-0 size-full" />
      <img data-planet-lines src="/patterns/earth-lines.svg" alt="" className="absolute inset-0 size-full opacity-0" />
    </>
  );
}
function DemoStars() {
  return <img src="/patterns/stars.svg" alt="" className="absolute inset-0 size-full" />;
}
