import { useEffect, useRef } from "react";
import { type ClipProps, OUT, play } from "../play";

type SlideTextProps = ClipProps & {
  text: string;
  startDelay?: number;
  className?: string;
};

// When the last word has finished arriving, measured from startDelay.
export const slideTextMs = (words: number) => (words - 1) * 90 + (640 - (words - 1) * 40);

// Words travel in from the right and resolve from a blur, so the line reads as pulled in by a leftward wipe.
// The first word travels furthest and lands first; distances and blur are in em so they scale with the type.
export function SlideText({ runKey, speed, reduced, text, startDelay = 300, className }: SlideTextProps) {
  const root = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const words = [...root.current!.querySelectorAll<HTMLElement>("[data-w]")];
    const anims: Animation[] = [];
    words.forEach((w, i) => {
      play(
        w,
        reduced
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { opacity: 0, translate: `${1.2 - i * 0.25}em 0`, filter: "blur(0.12em)" },
              { opacity: 1, translate: "0 0", filter: "blur(0)" },
            ],
        { duration: reduced ? 300 : 640 - i * 40, delay: startDelay + i * 90, easing: reduced ? "ease" : OUT },
        speed,
        anims,
      );
    });
    return () => anims.forEach((a) => a.cancel());
  }, [runKey, speed, reduced, startDelay]);

  const words = text.split(" ");
  return (
    <h1 ref={root} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((w, i) => (
          <span key={i} data-w className="inline-block whitespace-pre opacity-0">
            {i < words.length - 1 ? `${w} ` : w}
          </span>
        ))}
      </span>
    </h1>
  );
}
