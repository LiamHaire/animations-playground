import type { CSSProperties, Ref } from "react";
import { useEffect, useRef } from "react";
import { type ClipProps, cq, play } from "../play";

// Hand-written text (from the Patterns film): each glyph's outline is traced by the pen, then its ink settles in.
// Lines are real glyph outlines, one path per glyph, made offline from a font file by scripts/gen-glyphs.cjs (Amatic SC
// 96px), so the pen follows the letter shapes. Sizes are px in a 1920-wide frame.
export type ScribbleLine = { text: string; w: number; y0: number; h: number; paths: readonly string[] };

export const GLYPH_GAP = 38; // each letter starts as the pen moves on from the last
export const GLYPH_MS = 160; // outline scribble per letter
export const INK_MS = 80; // ink fills in once its outline closes
export const SCRIBBLE_INK = "#2a2e36";
// From the first glyph starting to the last one inked. `pace` scales the whole write-on.
export const writeMs = (line: ScribbleLine, pace = 1) => ((line.paths.length - 1) * GLYPH_GAP + GLYPH_MS + INK_MS) * pace;

// Writes on every glyph under `root` (a Scribble), starting at `at`.
export function scribble(root: Element, at: number, speed: number, reduced: boolean, anims: Animation[], pace = 1) {
  const glyphMs = GLYPH_MS * pace, inkMs = INK_MS * pace;
  root.querySelectorAll<SVGPathElement>("[data-g]").forEach((g, i) => {
    const t = at + i * GLYPH_GAP * pace;
    if (reduced) {
      play(g, [{ fillOpacity: 0, strokeDashoffset: 0 }, { fillOpacity: 1, strokeDashoffset: 0 }], { duration: glyphMs, delay: t }, speed, anims);
      return;
    }
    play(g, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: glyphMs, delay: t, easing: "cubic-bezier(0.45, 0, 0.55, 1)" }, speed, anims);
    play(g, [{ fillOpacity: 0 }, { fillOpacity: 1 }], { duration: inkMs, delay: t + glyphMs * 0.7, easing: "ease-out" }, speed, anims);
  });
}

// The line, undrawn, centred across its container. `scale` sizes it against the 96px it was generated at.
export function Scribble({ line, ref, style, ink = SCRIBBLE_INK, scale = 1 }: { line: ScribbleLine; ref?: Ref<SVGSVGElement>; style?: CSSProperties; ink?: string; scale?: number }) {
  const w = (line.w + 8) * scale;
  return (
    <svg
      ref={ref}
      role="img"
      aria-label={line.text}
      viewBox={`-4 ${line.y0 - 4} ${line.w + 8} ${line.h + 8}`}
      className="absolute overflow-visible"
      style={{ width: cq(w), left: `calc(50% - ${cq(w / 2)})`, ...style }}
    >
      {line.paths.map((d, i) => (
        <path
          key={i}
          data-g
          d={d}
          pathLength={1}
          fill={ink}
          fillOpacity={0}
          stroke={ink}
          strokeWidth={0.8}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="1 1"
          strokeDashoffset={1}
        />
      ))}
    </svg>
  );
}

// A self-running line: writes on at `startDelay`, and fades out at `outAt` if given.
export function ScribbleText({ runKey, speed, reduced, line, startDelay = 300, outAt, pace = 1, ink, scale, style }: ClipProps & {
  line: ScribbleLine; startDelay?: number; outAt?: number; pace?: number; ink?: string; scale?: number; style?: CSSProperties;
}) {
  const root = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const anims: Animation[] = [];
    scribble(root.current!, startDelay, speed, reduced, anims, pace);
    if (outAt !== undefined) play(root.current!, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: outAt, easing: "ease-in" }, speed, anims);
    return () => anims.forEach((a) => a.cancel());
  }, [runKey, speed, reduced, startDelay, outAt, pace]);
  return <Scribble line={line} ref={root} ink={ink} scale={scale} style={{ top: "50%", translate: "0 -50%", ...style }} />;
}
