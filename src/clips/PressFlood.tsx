import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { type ClipProps, IN_OUT, OUT, play } from "../play";

export const PRESS_DOWN_MS = 140;
export const PRESS_HOLD_MS = 80;
export const PRESS_UP_MS = 220;
export const PRESS_TOTAL_MS = PRESS_DOWN_MS + PRESS_HOLD_MS + PRESS_UP_MS;
export const FLOOD_MS = 240;
// Slow to start, then speeds up as it fills the frame.
const FLOOD_EASE = "cubic-bezier(0.4, 0, 0.7, 0.6)";
// The flood starts as the box starts to pop back up.
export const FLOOD_OFFSET_MS = PRESS_DOWN_MS + PRESS_HOLD_MS;

// Animation keyframes use literal colours (the CSS tokens are --connectors-orange and --connectors-orange-pressed).
const ORANGE = "#ea580c";
const ORANGE_PRESSED = "#c2410c";
const FLOOD_END = "#f15d22";

const PRESS: Keyframe[] = [
  { transform: "translateY(0) scale(1)", backgroundColor: ORANGE, offset: 0, easing: OUT },
  { transform: "translateY(0.03em) scale(0.92)", backgroundColor: ORANGE_PRESSED, offset: PRESS_DOWN_MS / PRESS_TOTAL_MS, easing: "linear" },
  { transform: "translateY(0.03em) scale(0.92)", backgroundColor: ORANGE_PRESSED, offset: FLOOD_OFFSET_MS / PRESS_TOTAL_MS, easing: OUT },
  { transform: "translateY(-0.02em) scale(1.06)", backgroundColor: ORANGE, offset: (FLOOD_OFFSET_MS + 120) / PRESS_TOTAL_MS, easing: IN_OUT },
  { transform: "translateY(0) scale(1)", backgroundColor: ORANGE, offset: 1 },
];

type PressFloodProps = ClipProps & {
  at: number;
  className?: string;
  children: ReactNode;
};

// A box that is pressed down and pops back up, and as it pops its own colour scales out to cover the whole stage.
// The flood is a child of the box, so it grows from exactly where the box is.
export function PressFlood({ runKey, speed, reduced, at, className, children }: PressFloodProps) {
  const box = useRef<HTMLSpanElement>(null);
  const flood = useRef<HTMLSpanElement>(null);
  const [cover, setCover] = useState(14);

  // The scale at which the box, grown from its own centre, covers the stage with some to spare. Measured from layout,
  // so it holds on any aspect ratio. The vertical allowance covers the word's resting lift offset at frame zero.
  useLayoutEffect(() => {
    const measure = () => {
      const b = box.current;
      const stage = b?.closest<HTMLElement>("[data-stage]");
      if (!b || !stage) return;
      const sr = stage.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const cx = br.left + br.width / 2 - sr.left;
      const cy = br.top + br.height / 2 - sr.top;
      const w = b.offsetWidth;
      const h = b.offsetHeight;
      const need = Math.max((2 * Math.max(cx, sr.width - cx)) / w, (2 * (Math.max(cy, sr.height - cy) + sr.height * 0.06)) / h);
      const next = Math.ceil(need * 1.12 * 100) / 100;
      setCover((prev) => (Math.abs(prev - next) > 0.01 ? next : prev));
    };
    measure();
    void document.fonts.ready.then(measure);
    const stage = box.current?.closest<HTMLElement>("[data-stage]");
    if (!stage) return;
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const b = box.current!;
    const f = flood.current!;
    const anims: Animation[] = [];
    const floodAt = at + FLOOD_OFFSET_MS;
    if (reduced) {
      play(f, [{ opacity: 0, transform: `scale(${cover})` }, { opacity: 1, transform: `scale(${cover})` }], { duration: 300, delay: floodAt, easing: "ease" }, speed, anims);
    } else {
      play(b, PRESS, { duration: PRESS_TOTAL_MS, delay: at, easing: "linear" }, speed, anims);
      // The flood is painted over the word like it is over the rest of the line, and fades in over a few frames so
      // the word is covered by the orange and not cut off.
      play(f, [{ opacity: 0 }, { opacity: 1 }], { duration: 90, delay: floodAt, easing: "linear" }, speed, anims);
      play(f, [{ transform: "scale(1)" }, { transform: `scale(${cover})` }], { duration: FLOOD_MS, delay: floodAt, easing: FLOOD_EASE }, speed, anims);
      play(f, [{ backgroundColor: ORANGE }, { backgroundColor: FLOOD_END }], { duration: 450, delay: floodAt + FLOOD_MS * 0.4, easing: "ease" }, speed, anims);
    }
    return () => anims.forEach((a) => a.cancel());
  }, [runKey, speed, reduced, at, cover]);

  return (
    <span ref={box} className={`relative ${className ?? ""}`} style={{ background: "var(--connectors-orange)" }}>
      {children}
      <span
        ref={flood}
        aria-hidden
        data-flood
        data-cover={cover}
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--connectors-orange)", borderRadius: "inherit", opacity: 0 }}
      />
    </span>
  );
}
