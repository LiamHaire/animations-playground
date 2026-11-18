import { type ReactNode, useEffect, useRef } from "react";
import { type ClipProps, OUT, play } from "../play";

type LiftWordsProps = ClipProps & {
  at: number;
  step?: number; // gap between one word starting and the next
  ms?: number;
  children: ReactNode[]; // one entry per word
};

// Each child is a word. They lift in one after another from below their baseline, resolving from a slight blur.
// Distance and blur are in em so they scale with the type.
export function LiftWords({ runKey, speed, reduced, at, step = 140, ms = 560, children }: LiftWordsProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const words = [...root.current!.querySelectorAll<HTMLElement>("[data-lw]")];
    const anims: Animation[] = [];
    words.forEach((w, i) => {
      play(
        w,
        reduced
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { opacity: 0, translate: "0 0.5em", filter: "blur(0.06em)" },
              { opacity: 1, translate: "0 0", filter: "blur(0)" },
            ],
        { duration: reduced ? 300 : ms, delay: at + i * step, easing: reduced ? "ease" : OUT },
        speed,
        anims,
      );
    });
    return () => anims.forEach((a) => a.cancel());
  }, [runKey, speed, reduced, at, step, ms]);

  return (
    <div ref={root} aria-hidden className="contents">
      {children.map((child, i) => (
        <span key={i} data-lw className="inline-block whitespace-pre opacity-0">
          {child}
        </span>
      ))}
    </div>
  );
}
