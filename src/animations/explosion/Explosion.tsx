import { useEffect, useRef } from "react";
import { type ClipProps, play } from "../../play";

// Hand-drawn explosion, 23 frames (./frames/01..23.svg, 1536x860, background rectangle stripped). Each frame is on screen
// for its own time: quick through the flash and fireball, slower as the smoke breaks up and thins out.
const FRAME_MS = [
  30, 30, 35, 35, 40, // flash and the fireball swelling
  45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, // fireball cooling into smoke
  60, 60, 60, 60, 60, 60, // smoke breaking up
  75, // last wisps
];
export const EXPLOSION_MS = FRAME_MS.reduce((a, b) => a + b, 0);
// When each frame comes on, from the start of the explosion.
export const EXPLOSION_START: number[] = FRAME_MS.map((_, i) => FRAME_MS.slice(0, i).reduce((a, b) => a + b, 0));
const PEAK = 6; // the frame held for reduced motion
// The drawings' size, and the middle of the first flash in them: put this on the point the blast comes from.
export const EXPLOSION_SIZE = [1536, 860] as const;
export const EXPLOSION_ORIGIN = [734, 450] as const;

// Frames come from Figma (Notch Concept, node 330:49), every fill bound to a tailwind colour variable, export background
// removed so the holes in the smoke are see-through. The smoke is drawn in tailwind gray (slightly blue); each step is
// swapped for the neutral step two darker (Liam: same steps read too light). Neutral/950 is the dark stage background,
// so the darkest two both stop at 900 to stay visible. Fire (amber, yellow, orange) stays as drawn.
const GRAY_TO_NEUTRAL: Record<string, string> = {
  "#D1D5DB": "var(--neutral-500)", // gray/300
  "#9CA3AF": "var(--neutral-600)", // gray/400
  "#6B7280": "var(--neutral-700)", // gray/500
  "#4B5563": "var(--neutral-800)", // gray/600, the main smoke
  "#374151": "var(--neutral-900)", // gray/700
  "#1F2937": "var(--neutral-900)", // gray/800
};

const raw = import.meta.glob("./frames/*.svg", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const FRAMES = Object.keys(raw)
  .sort()
  .map((k) =>
    raw[k]
      .replace(/fill="(#[0-9a-f]{6})"/gi, (m, hex) => (GRAY_TO_NEUTRAL[hex.toUpperCase()] ? `fill="${GRAY_TO_NEUTRAL[hex.toUpperCase()]}"` : m))
      .replace('width="1536" height="860"', 'width="100%" height="100%"'),
  );

// Plays the explosion on the frames rendered by <ExplosionFrames>, starting `at` ms in.
export function explode(root: Element, at: number, speed: number, reduced: boolean, anims: Animation[]) {
  const frames = [...root.querySelectorAll("[data-explosion-frame]")];
  if (reduced) {
    play(frames[PEAK], [{ opacity: 0 }, { opacity: 1 }, { opacity: 1 }, { opacity: 0 }], { duration: 900, delay: at, easing: "ease", fill: "forwards" }, speed, anims);
    return;
  }
  // One animation per frame: it shows for its own slot, then the next one takes over. Frames sit at opacity 0 before
  // and after, so only one is visible at a time.
  frames.forEach((el, i) => {
    play(el, [{ opacity: 1 }, { opacity: 1, offset: 0.999 }, { opacity: 0 }], { duration: FRAME_MS[i], delay: at + EXPLOSION_START[i], easing: "linear", fill: "forwards" }, speed, anims);
  });
}

// The 23 drawings stacked, all hidden. Fills its parent, which should have the drawings' aspect (EXPLOSION_SIZE).
export function ExplosionFrames({ ref, className = "absolute inset-0", style }: { ref?: React.Ref<HTMLDivElement>; className?: string; style?: React.CSSProperties }) {
  return (
    <div ref={ref} className={className} style={style}>
      {FRAMES.map((svg, i) => (
        <div key={i} data-explosion-frame className="absolute inset-0" style={{ opacity: 0 }} dangerouslySetInnerHTML={{ __html: svg }} />
      ))}
    </div>
  );
}

export function Explosion({ runKey, speed, reduced }: ClipProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anims: Animation[] = [];
    explode(root.current!, 0, speed, reduced, anims);
    return () => anims.forEach((a) => a.cancel());
  }, [runKey, speed, reduced]);

  return <ExplosionFrames ref={root} />;
}
