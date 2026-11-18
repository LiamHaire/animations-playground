import { useEffect, useRef } from "react";
import { type ClipProps, play } from "../play";
const BOUNCE: Keyframe[] = [
  { translate: "0 0.55em", opacity: 0, offset: 0 },
  { translate: "0 -0.09em", opacity: 1, offset: 0.6 },
  { translate: "0 0.025em", opacity: 1, offset: 0.82 },
  { translate: "0 0", opacity: 1, offset: 1 },
];
const DROP: Keyframe[] = [
  { translate: "0 -0.9em", scale: "0.7 1.35", opacity: 0, offset: 0, easing: "cubic-bezier(.5,0,.9,.6)" },
  { translate: "0 -0.45em", scale: "0.8 1.25", opacity: 1, offset: 0.2, easing: "cubic-bezier(.5,0,.9,.6)" },
  { translate: "0 0", scale: "1.5 0.6", opacity: 1, offset: 0.5, easing: "cubic-bezier(.2,.7,.4,1)" },
  { translate: "0 -0.2em", scale: "0.9 1.12", opacity: 1, offset: 0.72, easing: "cubic-bezier(.6,0,.9,.5)" },
  { translate: "0 0", scale: "1.15 0.85", opacity: 1, offset: 0.88, easing: "linear" },
  { translate: "0 0", scale: "1 1", opacity: 1, offset: 1 },
];
const BOUNCE_MS = 340;
// When letter i starts, before pace: 30ms apart, nudged a little so the row doesn't tick like a metronome.
const letterAt = (i: number) => i * 30 * (0.92 + ((i * 37) % 16) / 100);
// From the first letter starting to the last one settling, so a caller can work out the `pace` that lands it on a beat.
export const bounceLength = (text: string, pace = 1) => (letterAt([...text].length - 1) + BOUNCE_MS) * pace;

type BounceTextProps = ClipProps & {
  text: string;
  dot?: boolean;
  startDelay?: number;
  className?: string;
  color?: string;
  pace?: number; // scales the bounce and its stagger, so a caller can fit it to a tempo
};

export function BounceText({ runKey, speed, reduced, text, dot = false, startDelay = 300, className, color = "var(--stage-fg)", pace = 1 }: BounceTextProps) {
  const root = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = root.current!;
    const chars = [...el.querySelectorAll<HTMLElement>("[data-c]")];
    const dotEl = el.querySelector<HTMLElement>("[data-dot]");
    const anims: Animation[] = [];
    if (reduced) {
      [...chars, ...(dotEl ? [dotEl] : [])].forEach((c) =>
        play(c, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: startDelay, easing: "ease" }, speed, anims),
      );
    } else {
      chars.forEach((c, i) => {
        play(c, BOUNCE, { duration: BOUNCE_MS * pace, delay: startDelay + letterAt(i) * pace, easing: "ease-out" }, speed, anims);
      });
      if (dotEl) {
        const dotAt = startDelay + (chars.length * 30 + 340 + 50) * pace;
        play(dotEl, DROP, { duration: 460, delay: dotAt }, speed, anims);
      }
    }
    return () => anims.forEach((a) => a.cancel());
  }, [runKey, speed, reduced, startDelay, pace]);

  return (
    <h1 ref={root} className={className ?? "text-[7cqw] font-medium tracking-tight whitespace-nowrap"} style={{ color }}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {[...text].map((c, i) => (
          <span key={i} data-c className="inline-block whitespace-pre opacity-0">{c}</span>
        ))}
        {dot && <span data-dot className="ml-[0.08em] inline-block size-[0.12em] origin-bottom rounded-full bg-brand opacity-0" />}
      </span>
    </h1>
  );
}

export function BounceTitle(props: ClipProps) {
  return <BounceText {...props} text="Meet Smart Summaries" dot />;
}
