import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { type ClipProps, cq, play } from "../play";

// Full-frame glitch from one frame to another (from the Patterns film, "...a new era dawns"): the whole picture jitters
// sideways with an RGB split, a slice of the incoming frame tears across it, noise lines flash through the text band, the
// odd frame flashes slate blue, and the incoming frame flickers in until it holds. Every frame is held (steps(1) per
// keyframe), so each one is a hard cut, `steps` of them across `duration`. Seeded, so it is the same every replay.
export const GLITCH_MS = 600;
export const GLITCH_STEPS = 24; // 25ms each
export const GLITCH_SLATE = "#1e293b"; // tailwind slate-800

// Deterministic so every replay and render glitches the same way.
export const seeded = (s: number) => () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
const held = (frames: Keyframe[]) => [...frames.map((f, i) => ({ ...f, offset: i / frames.length, easing: "steps(1, end)" })), { ...frames[frames.length - 1], offset: 1 }];

export type GlitchParts = {
  layer: HTMLElement; // the whole picture, both frames: jitters and splits
  incoming: HTMLElement; // the new frame, over the old one: flickers in, then holds
  band: HTMLElement; // a second copy of the new frame, torn into slices across the picture
  slate: HTMLElement; // a flat colour, flashed in on the odd frame
  noise: HTMLElement[]; // thin lines, re-thrown through the text band every frame
};
export type GlitchOptions = {
  at: number;
  seed?: number;
  duration?: number;
  steps?: number;
  inkFrom: string; // noise line colours before and after the cut
  inkTo: string;
  noiseY?: readonly [number, number]; // the text band the noise lines fall in, in 1920-wide frame units
  noiseX?: readonly [number, number];
};

export function glitch(parts: GlitchParts, o: GlitchOptions, speed: number, reduced: boolean, anims: Animation[]) {
  const { at, seed = 23, duration = GLITCH_MS, steps = GLITCH_STEPS, inkFrom, inkTo, noiseY = [450, 630], noiseX = [560, 1360] } = o;
  const R = seeded(seed);
  const glitchOpts = { duration, delay: at, easing: "linear", fill: "none" as FillMode };
  // Mostly the old frame at the start, mostly the new one later, and the last few frames always new so it lands clean.
  const flick = Array.from({ length: steps }, (_, i) => {
    const p = i / (steps - 1);
    return p > 0.82 ? 1 : R() < p * 1.1 ? 1 : 0;
  });
  if (!reduced) {
    const last = steps - 2; // the final two frames sit still so it lands clean
    const frames = flick.map((_, i) => {
      const p = i / (steps - 1);
      const k = i >= last ? 0 : 0.45 + 0.55 * (1 - Math.abs(p - 0.5) * 1.6); // strongest in the middle, never calm before the end
      // Big sideways shoves, the odd hard kick, and a small vertical jolt now and then.
      const kick = R() < 0.2 ? 2.2 : 1;
      const x = Math.round((R() * 2 - 1) * 120 * k * kick);
      const y = R() < 0.3 ? Math.round((R() * 2 - 1) * 26 * k) : 0;
      const split = k && R() < 0.75 ? Math.round(6 + R() * 18 * k) : 0;
      return {
        transform: `translate(${cq(x)}, ${cq(y)})`,
        filter: split ? `drop-shadow(${cq(split)} 0 0 rgba(255,43,214,0.85)) drop-shadow(${cq(-split)} 0 0 rgba(34,211,238,0.85))` : "none",
      };
    });
    play(parts.layer, held(frames), glitchOpts, speed, anims);
    // Displaced band: a slice of the incoming frame torn hard sideways, a new slice most frames.
    play(
      parts.band,
      held(flick.map((_, i) => {
        if (i >= last || R() < 0.2) return { opacity: 0, clipPath: "inset(0 0 0 0)", transform: "none" };
        const top = Math.round(R() * 85), h = Math.round(3 + R() * 30);
        return { opacity: 1, clipPath: `inset(${top}% 0 ${Math.max(0, 100 - top - h)}% 0)`, transform: `translateX(${cq(Math.round((R() * 2 - 1) * 260))})` };
      })),
      glitchOpts,
      speed,
      anims,
    );
    // The odd frame in the flash colour: sometimes the whole picture, sometimes a thick torn band of it.
    play(
      parts.slate,
      held(flick.map((_, i) => {
        if (i < 2 || i >= last - 1 || R() > 0.2) return { opacity: 0, clipPath: "inset(0 0 0 0)", transform: "none" };
        if (R() < 0.5) return { opacity: 1, clipPath: "inset(0 0 0 0)", transform: "none" };
        const top = Math.round(R() * 70), h = Math.round(12 + R() * 30);
        return { opacity: 1, clipPath: `inset(${top}% 0 ${Math.max(0, 100 - top - h)}% 0)`, transform: `translateX(${cq(Math.round((R() * 2 - 1) * 160))})` };
      })),
      glitchOpts,
      speed,
      anims,
    );
    // Noise: thin horizontal lines through the text band, re-thrown every frame, in the ink of whichever frame is showing.
    parts.noise.forEach((ln) => {
      play(
        ln,
        held(flick.map((a2) => {
          if (R() < 0.45) return { opacity: 0 };
          const w = Math.round(80 + R() * 620);
          return {
            opacity: 0.35 + R() * 0.55,
            top: cq(Math.round(noiseY[0] + R() * (noiseY[1] - noiseY[0]))),
            left: cq(Math.round(noiseX[0] + R() * (noiseX[1] - noiseX[0] - w))),
            width: cq(w),
            height: cq(R() < 0.75 ? 2 : 4),
            background: R() < 0.25 ? (R() < 0.5 ? "#ff2bd6" : "#22d3ee") : a2 ? inkTo : inkFrom,
          };
        })),
        glitchOpts,
        speed,
        anims,
      );
    });
  }
  play(
    parts.incoming,
    reduced ? [{ opacity: 0 }, { opacity: 1 }] : held(flick.map((o) => ({ opacity: o }))),
    { duration: reduced ? 1 : duration, delay: at, easing: reduced ? "steps(1, start)" : "linear", fill: "forwards" },
    speed,
    anims,
  );
}

// Fonts by short name; anything else is used as a CSS font-family as it is.
export const FONTS: Record<string, string> = {
  amatic: '"Amatic SC", cursive',
  geist: '"Geist Variable", ui-sans-serif, system-ui, sans-serif',
  satoshi: '"Satoshi", "Helvetica Neue", Arial, sans-serif',
  montserrat: '"Montserrat Variable", ui-sans-serif, system-ui, sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
};
// One side of the cut. `size` and `tracking` are px in a 1920-wide frame, so they scale with the stage.
export type GlitchFont = { family?: string; weight?: number; size?: number; tracking?: number; color?: string; style?: CSSProperties };
export const glitchFontStyle = (f: GlitchFont): CSSProperties => ({
  fontFamily: f.family ? (FONTS[f.family] ?? f.family) : undefined,
  fontWeight: f.weight,
  fontSize: f.size ? cq(f.size) : undefined,
  letterSpacing: f.tracking ? cq(f.tracking) : undefined,
  color: f.color,
  lineHeight: "normal",
  whiteSpace: "nowrap",
  ...f.style,
});

// The film's cut: hand-written Amatic SC on paper, to Geist Medium on the dark frame.
export const GLITCH_FROM: GlitchFont = { family: "amatic", weight: 400, size: 96, color: "#2a2e36" };
export const GLITCH_TO: GlitchFont = { family: "geist", weight: 500, size: 72, color: "#fafafa" };
const PAPER = "linear-gradient(-62.37deg, rgba(244,245,247,0.5) 8.38%, #fff 47.1%), #fff";

type GlitchTransitionProps = ClipProps & {
  text?: string; // on both sides of the cut...
  toText?: string; // ...unless the new frame says something else
  from?: ReactNode; // or any content in place of the text
  to?: ReactNode;
  fromFont?: GlitchFont;
  toFont?: GlitchFont;
  fromBg?: string;
  toBg?: string;
  at?: number;
  duration?: number;
  steps?: number;
  seed?: number; // a different seed, a different (but repeatable) glitch
  flash?: string; // the odd frame's colour
};

function Face({ bg, font, children }: { bg: string; font: GlitchFont; children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: bg }}>
      <div style={glitchFontStyle(font)}>{children}</div>
    </div>
  );
}

export function GlitchTransition({
  runKey, speed, reduced, text = "...a new era dawns", toText, from, to, fromFont = GLITCH_FROM, toFont = GLITCH_TO,
  fromBg = PAPER, toBg = "#0a0a0a", at = 1000, duration = GLITCH_MS, steps = GLITCH_STEPS, seed = 23, flash = GLITCH_SLATE,
}: GlitchTransitionProps) {
  const root = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const incoming = useRef<HTMLDivElement>(null);
  const band = useRef<HTMLDivElement>(null);
  const slate = useRef<HTMLDivElement>(null);
  const noise = useRef<HTMLDivElement>(null);
  const inkFrom = fromFont.color ?? "#2a2e36";
  const inkTo = toFont.color ?? "#fafafa";

  useEffect(() => {
    const anims: Animation[] = [];
    // The noise falls in a band through the middle of the frame, whatever the aspect.
    const r = root.current!;
    const mid = ((r.clientHeight / r.clientWidth) * 1920) / 2;
    glitch(
      { layer: layer.current!, incoming: incoming.current!, band: band.current!, slate: slate.current!, noise: [...noise.current!.children] as HTMLElement[] },
      { at, seed, duration, steps, inkFrom, inkTo, noiseY: [mid - 90, mid + 90] },
      speed,
      reduced,
      anims,
    );
    return () => anims.forEach((a) => a.cancel());
  }, [runKey, speed, reduced, at, duration, steps, seed, inkFrom, inkTo]);

  const after = to ?? toText ?? text;
  return (
    <div ref={root} className="absolute inset-0 overflow-hidden" role="img" aria-label={toText ?? text}>
      <div ref={layer} className="absolute inset-0" aria-hidden>
        <Face bg={fromBg} font={fromFont}>{from ?? text}</Face>
        <div ref={incoming} className="absolute inset-0 opacity-0">
          <Face bg={toBg} font={toFont}>{after}</Face>
        </div>
        <div ref={band} className="absolute inset-0 opacity-0">
          <Face bg={toBg} font={toFont}>{after}</Face>
        </div>
        <div ref={slate} className="absolute inset-0 opacity-0" style={{ background: flash }} />
        <div ref={noise} className="pointer-events-none absolute inset-0">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="absolute opacity-0" />
          ))}
        </div>
      </div>
    </div>
  );
}
