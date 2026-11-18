import { useEffect, useRef } from "react";
import type { ClipProps } from "../play";
// Values taken from the portfolio intro (hero-animation.html): BLINK, LEAD, PACE and the caret proportions.
const BLINK = 320;
const LEAD = 100;
const PACE = 0.42;
const TAIL = 150;
const FADE = 240;
const KEYS = [0, 150, 140, 130, 150, 170, 140, 130, 150, 140, 160];
const jitter = (ms: number, pace: number) => ms * pace * (0.92 + Math.random() * 0.16);

// When the caret has finished fading, ignoring the +-8% jitter on each key. Lower pace types faster.
export const typeEndMs = (text: string, startDelay: number, pace = PACE) =>
  startDelay + BLINK * 2 + LEAD + [...text].reduce((sum, _, i) => sum + KEYS[i % KEYS.length] * pace, 0) + TAIL + FADE;

type TypeTextProps = ClipProps & {
  text: string;
  startDelay?: number;
  pace?: number;
  className?: string;
  onKey?: (index: number) => void; // fired as each letter appears
};

export function TypeText({ runKey, speed, reduced, text, startDelay = 300, pace = PACE, className, onKey }: TypeTextProps) {
  const word = useRef<HTMLSpanElement>(null);
  const caret = useRef<HTMLSpanElement>(null);
  const onKeyRef = useRef(onKey);
  onKeyRef.current = onKey;

  useEffect(() => {
    const w = word.current!;
    const c = caret.current!;
    const timers: number[] = [];
    let at = 0;
    const after = (ms: number, fn: () => void) => {
      at += ms;
      timers.push(window.setTimeout(fn, at / speed));
    };

    c.style.transition = "none";
    c.style.opacity = "0";
    c.style.marginLeft = "0";

    if (reduced) {
      w.textContent = text;
      c.style.marginLeft = "";
      return;
    }
    w.textContent = "";

    after(startDelay, () => (c.style.opacity = "1"));
    after(BLINK, () => (c.style.opacity = "0"));
    after(BLINK, () => (c.style.opacity = "1"));
    after(LEAD, () => {});
    [...text].forEach((_, i) => {
      after(jitter(KEYS[i % KEYS.length], pace), () => {
        w.textContent = text.slice(0, i + 1);
        c.style.marginLeft = "";
        onKeyRef.current?.(i);
      });
    });
    after(TAIL, () => {
      c.style.transition = `opacity ${FADE / speed}ms cubic-bezier(.4, 0, .2, 1)`;
      c.style.opacity = "0";
    });

    return () => {
      timers.forEach(clearTimeout);
      w.textContent = "";
    };
  }, [runKey, speed, reduced, text, startDelay, pace]);

  return (
    <h1 className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="flex items-center justify-center">
        <span ref={word} className="min-h-[1em] whitespace-pre" />
        <span
          ref={caret}
          className="ml-[0.081em] inline-block h-[0.868em] w-[0.059em] rounded-full opacity-0"
          style={{ background: "color-mix(in srgb, currentColor 60%, transparent)" }}
        />
      </span>
    </h1>
  );
}
