import { useEffect, useRef } from "react";
import { type ClipProps, play } from "../../play";

// A full-stage wash that sits over the flood once it has covered the frame: the logo's yellow at 15% in the top-left
// corner, fading to nothing by the opposite corner. It is a stage-sized layer and not part of the flood element
// because the flood is scaled about the PLACE box, so its own corner is far outside the frame.
const TINT = "linear-gradient(135deg, color-mix(in srgb, var(--connectors-logo-yellow) 15%, transparent) 0%, transparent 100%)";

export function FloodTint({ runKey, speed, reduced, at, ms }: ClipProps & { at: number; ms: number }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anims: Animation[] = [];
    play(el.current!, [{ opacity: 0 }, { opacity: 1 }], { duration: reduced ? 300 : ms, delay: at, easing: "ease" }, speed, anims);
    return () => anims.forEach((a) => a.cancel());
  }, [runKey, speed, reduced, at, ms]);

  return <div ref={el} aria-hidden data-tint className="pointer-events-none absolute inset-0" style={{ background: TINT, opacity: 0, zIndex: 15 }} />;
}
