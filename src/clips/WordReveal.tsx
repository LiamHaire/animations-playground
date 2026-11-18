import { useEffect, useRef } from "react";
import { type ClipProps, play } from "../play";
const WORDS = ["Ship", "faster", "with", "automated", "workflows"];
const ACCENT = new Set(["automated", "workflows"]);

export function WordReveal({ runKey, speed, reduced }: ClipProps) {
  const root = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const words = [...root.current!.querySelectorAll<HTMLElement>("[data-w]")];
    const anims: Animation[] = [];
    words.forEach((w, i) => {
      const lead = ACCENT.has(w.dataset.w!);
      const delay = 250 + i * 110 - (i > 2 ? 30 * (i - 2) : 0);      play(
        w,
        reduced
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { opacity: 0, translate: `0 ${lead ? 0.3 : 0.18}em`, filter: "blur(8px)" },
              { opacity: 1, translate: "0 0", filter: "blur(0)" },
            ],
        { duration: lead ? 700 : 550, delay },
        speed,
        anims,
      );
    });
    return () => anims.forEach((a) => a.cancel());
  }, [runKey, speed, reduced]);

  return (
    <h1 ref={root} className="max-w-[80%] text-center text-[6.2cqw] leading-[1.1] font-medium tracking-tight" style={{ color: "var(--stage-fg)" }}>
      {WORDS.map((w) => (
        <span key={w} data-w={w} className={`mr-[0.25em] inline-block opacity-0 ${ACCENT.has(w) ? "text-brand" : ""}`}>{w}</span>
      ))}
    </h1>
  );
}
