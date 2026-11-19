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
const START: number[] = FRAME_MS.map((_, i) => FRAME_MS.slice(0, i).reduce((a, b) => a + b, 0));
const PEAK = 6; // the frame held for reduced motion

// The drawings use their own browns, yellows and a near-white (#F6F6F6, the paper they were drawn on, which also fills the
// holes in the smoke). Recoloured on load so they follow the project's tokens:
//  - the paper white becomes the stage background, so the holes are see-through in dark and light
//  - smoke (the low-saturation browns and greys) becomes the neutral tokens, by lightness
//  - fire (saturated yellows and oranges) is pulled onto the brand orange #F15D22 (hue 16), the yellows only leaning
//    slightly warmer and lighter so the core still reads against the rim
const SMOKE_BY_LIGHTNESS: [number, string][] = [
  [0.3, "var(--smoke-1)"],
  [0.37, "var(--smoke-2)"],
  [0.47, "var(--smoke-3)"],
  [1, "var(--smoke-4)"],
];
const ACCENT_HUE = 16;
const YELLOW_HUE = 54; // the yellowest fill in the drawings

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function toHex(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : [0, c, x];
  return "#" + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function recolour(hex: string): string {
  const up = hex.toUpperCase();
  if (up === "#F6F6F6") return "var(--stage-bg)";
  const [h, s, l] = toHsl(up);
  if (s < 0.55) return SMOKE_BY_LIGHTNESS.find(([max]) => l < max)![1];
  const warm = Math.min(1, Math.max(0, (h - 21) / (YELLOW_HUE - 21))); // 0 orange .. 1 yellow
  return toHex(ACCENT_HUE + warm * 8, Math.min(0.92, s), Math.min(0.62, l + warm * 0.06));
}

const raw = import.meta.glob("./frames/*.svg", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const FRAMES = Object.keys(raw)
  .sort()
  .map((k) =>
    raw[k]
      .replace(/fill="(#[0-9a-f]{6})"/gi, (_, hex) => `fill="${recolour(hex)}"`)
      .replace('width="1536" height="860"', 'width="100%" height="100%"'),
  );

export function Explosion({ runKey, speed, reduced }: ClipProps) {
  const frames = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const anims: Animation[] = [];
    if (reduced) {
      play(frames.current[PEAK]!, [{ opacity: 0 }, { opacity: 1 }, { opacity: 1 }, { opacity: 0 }], { duration: 900, easing: "ease", fill: "forwards" }, speed, anims);
      return () => anims.forEach((a) => a.cancel());
    }
    // One animation per frame: it shows for its own slot, then the next one takes over. Frames sit at opacity 0 before
    // and after, so only one is visible at a time.
    frames.current.forEach((el, i) => {
      play(el!, [{ opacity: 1 }, { opacity: 1, offset: 0.999 }, { opacity: 0 }], { duration: FRAME_MS[i], delay: START[i], easing: "linear", fill: "forwards" }, speed, anims);
    });
    return () => anims.forEach((a) => a.cancel());
  }, [runKey, speed, reduced]);

  return (
    <div className="absolute inset-0">
      {FRAMES.map((svg, i) => (
        <div
          key={i}
          ref={(el) => { frames.current[i] = el; }}
          className="absolute inset-0"
          style={{ opacity: 0 }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ))}
    </div>
  );
}
