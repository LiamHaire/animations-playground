import { type ReactNode, useEffect, useRef } from "react";
import { type ClipProps, cq, play } from "../play";

// Speed zoom out (from the Patterns film, the jungle into its spot on Earth): the outgoing frame shrinks into one spot
// on an accelerating curve with a little motion blur, while the incoming frame shrinks from huge down to its resting
// size around the same spot, so the two read as one camera move. Speed streaks rush outward from the spot.
export const ZOOM_MS = 750;
const ZOOM_EASE = "cubic-bezier(0.7, 0, 0.3, 1)";

type ZoomThroughProps = ClipProps & {
  from?: ReactNode;
  to?: ReactNode;
  at?: number;
  duration?: number;
  // Where the zoom goes through, as fractions of the frame's width and height. The film uses [0.573, 0.49], the meteor's
  // landing spot on Earth, right of centre.
  spot?: readonly [number, number];
  endScale?: number; // the outgoing frame at the end: a speck
  startScale?: number; // the incoming frame at the start: too big to make out
  inMs?: number; // the incoming frame fades up over the first part of the zoom, under the shrinking one
  streaks?: number; // 0 for none
  streakColor?: string;
};

export function ZoomThrough({
  runKey, speed, reduced, from, to, at = 900, duration = ZOOM_MS, spot = [0.5, 0.5], endScale = 0.006, startScale = 14,
  inMs = 360, streaks = 16, streakColor = "#fff",
}: ZoomThroughProps) {
  const out = useRef<HTMLDivElement>(null);
  const into = useRef<HTMLDivElement>(null);
  const lines = useRef<HTMLDivElement>(null);
  const origin = `${spot[0] * 100}% ${spot[1] * 100}%`;

  useEffect(() => {
    const anims: Animation[] = [];
    const opts = { duration, delay: at, easing: ZOOM_EASE, fill: "forwards" as FillMode };
    if (reduced) {
      play(out.current!, [{ opacity: 1 }, { opacity: 0 }], { ...opts, duration: 300, easing: "ease" }, speed, anims);
      play(into.current!, [{ opacity: 0 }, { opacity: 1 }], { ...opts, duration: 300, easing: "ease", fill: "both" }, speed, anims);
      return () => anims.forEach((a) => a.cancel());
    }
    play(out.current!, [
      { transform: "scale(1)", filter: "blur(0px)", opacity: 1 },
      { transform: "scale(0.35)", filter: `blur(${cq(3)})`, opacity: 1, offset: 0.35 },
      { transform: `scale(${endScale})`, filter: `blur(${cq(1)})`, opacity: 0 },
    ], opts, speed, anims);
    play(into.current!, [
      { transform: `scale(${startScale})`, opacity: 0 },
      { transform: `scale(${startScale * 0.4})`, opacity: 1, offset: inMs / duration },
      { transform: "scale(1)", opacity: 1 },
    ], { ...opts, fill: "both" }, speed, anims);
    lines.current!.querySelectorAll<HTMLElement>("[data-streak]").forEach((el, i) => {
      play(el, [
        { opacity: 0, transform: `rotate(${el.dataset.a}deg) translateX(${cq(30)}) scaleX(0.2)` },
        { opacity: 0.9, transform: `rotate(${el.dataset.a}deg) translateX(${cq(300)}) scaleX(1)`, offset: 0.4 },
        { opacity: 0, transform: `rotate(${el.dataset.a}deg) translateX(${cq(1300)}) scaleX(1.6)` },
      ], { duration: duration * 0.7, delay: at + 60 + (i % 5) * 40, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" }, speed, anims);
    });
    return () => anims.forEach((a) => a.cancel());
  }, [runKey, speed, reduced, at, duration, endScale, startScale, inMs, streaks]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div ref={into} className="absolute inset-0" style={{ transformOrigin: origin }}>{to ?? <DemoSpace spot={spot} />}</div>
      <div ref={out} className="absolute inset-0" style={{ transformOrigin: origin }}>{from ?? <DemoScene />}</div>
      <div ref={lines} className="pointer-events-none absolute inset-0" aria-hidden>
        {Array.from({ length: streaks }, (_, i) => (
          <div key={i} data-streak data-a={(i * 360) / streaks + (i % 3) * 7} className="absolute opacity-0"
            style={{ left: `${spot[0] * 100}%`, top: `${spot[1] * 100}%`, width: cq(160 + (i % 4) * 60), height: cq(3), transformOrigin: "0 50%", borderRadius: cq(2), background: streakColor }} />
        ))}
      </div>
    </div>
  );
}

function DemoScene() {
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#fafafa" }}>
      <p className="font-geist font-medium" style={{ fontSize: cq(120), color: "#0a0a0a" }}>Zoom out</p>
    </div>
  );
}
function DemoSpace({ spot }: { spot: readonly [number, number] }) {
  return (
    <div className="absolute inset-0" style={{ background: "#0a0a0a" }}>
      {Array.from({ length: 40 }, (_, i) => (
        <div key={i} className="absolute rounded-full bg-white" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 61) % 100}%`, width: cq(3 + (i % 3)), height: cq(3 + (i % 3)), opacity: 0.3 + (i % 4) * 0.15 }} />
      ))}
      <div className="absolute rounded-full" style={{ left: `${spot[0] * 100}%`, top: `${spot[1] * 100}%`, width: cq(380), height: cq(380), translate: "-50% -50%",
        background: "radial-gradient(circle at 35% 35%, #3b82f6, #1e3a8a 70%)" }} />
    </div>
  );
}
