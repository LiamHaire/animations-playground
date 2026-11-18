import { useEffect, useLayoutEffect, useRef } from "react";
import { type ClipProps, play } from "../play";
export const INFLATE_MS = 270;
export const POP_LEAD = 290; // inflate finishes just before the first letter pops
// Gap between one letter popping and the next, left to right. Each gap is 12% shorter than the last, so the pops speed up.
const POP_GAP_START = 46;
const INFLATE_STAGGER_MS = 22;
const POP_GAP_DECAY = 0.88;
// Time after the first pop at which letter `i` pops. Accepts fractions so other elements can sync to a point between letters.
export const popOffset = (i: number) => (POP_GAP_START * (1 - POP_GAP_DECAY ** i)) / (1 - POP_GAP_DECAY);

// angle (deg, 0 = right, -90 = up) and travel (em) for the droplets thrown off each pop
const DROPLETS = [
  { a: -75, d: 0.5 },
  { a: -25, d: 0.66 },
  { a: 30, d: 0.56 },
  { a: 80, d: 0.46 },
  { a: 135, d: 0.58 },
  { a: 205, d: 0.52 },
];

// Growth is even across the keyframes so the easing curve alone decides the pacing.
const INFLATE_EASE = "cubic-bezier(0.55, 0, 0.92, 0.5)";
const INFLATE: Keyframe[] = [
  { transform: "translateY(0) scale(1) rotate(0deg)", offset: 0 },
  { transform: "translateY(-0.04em) scale(1.064) rotate(-3deg)", offset: 0.4 },
  { transform: "translateY(-0.075em) scale(1.12) rotate(2.5deg)", offset: 0.75 },
  { transform: "translateY(-0.1em) scale(1.16) rotate(0deg)", offset: 1 },
];
const POP: Keyframe[] = [
  { transform: "translateY(-0.1em) scale(1.16) rotate(0deg)", opacity: 1 },
  { transform: "translateY(-0.14em) scale(1.5) rotate(0deg)", opacity: 0 },
];
const RING: Keyframe[] = [
  { opacity: 0.9, transform: "translate(-50%, -50%) scale(0.5)" },
  { opacity: 0, transform: "translate(-50%, -50%) scale(1.6)" },
];

type PopLettersProps = ClipProps & {
  text: string;
  popAt: number; // when the letters start to inflate (ms)
  fontSize?: string;
  className?: string;
  // Paint the whole word with one gradient (each letter gets its slice) instead of a flat colour.
  gradient?: string;
  accentA?: string;
  accentB?: string;
};

export function PopLetters({
  runKey, speed, reduced, text, popAt, fontSize, className, gradient,
  accentA = "var(--connectors-yellow)", accentB = "var(--connectors-orange)",
}: PopLettersProps) {
  const root = useRef<HTMLSpanElement>(null);

  // Each letter carries the gradient for the whole word, offset to its own position, so splitting the
  // word into animated letters doesn't restart the gradient on every one.
  useLayoutEffect(() => {
    if (!gradient) return;
    const measure = () => {
      const el = root.current;
      if (!el) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      el.querySelectorAll<HTMLElement>("[data-cell]").forEach((cell) => {
        const letter = cell.querySelector<HTMLElement>("[data-l]")!;
        letter.style.backgroundSize = `${w}px ${h}px`;
        letter.style.backgroundPosition = `${-(cell.offsetLeft + letter.offsetLeft)}px ${-(cell.offsetTop + letter.offsetTop)}px`;
      });
    };
    measure();
    document.fonts.ready.then(measure);
  }, [fontSize, gradient]);

  useEffect(() => {
    const el = root.current!;
    const cells = [...el.querySelectorAll<HTMLElement>("[data-cell]")];
    const anims: Animation[] = [];

    if (reduced) {
      play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: popAt + POP_LEAD, easing: "ease", fill: "forwards" }, speed, anims);
    } else {
      cells.forEach((cell, i) => {
        const letter = cell.querySelector<HTMLElement>("[data-l]")!;
        const ring = cell.querySelector<HTMLElement>("[data-ring]")!;
        const drops = [...cell.querySelectorAll<HTMLElement>("[data-drop]")];
        const popTime = popAt + POP_LEAD + popOffset(i);

        play(letter, INFLATE, { duration: INFLATE_MS, delay: popAt + i * INFLATE_STAGGER_MS, easing: INFLATE_EASE }, speed, anims);
        play(letter, POP, { duration: 60, delay: popTime, easing: "cubic-bezier(.2,.7,.4,1)", fill: "forwards" }, speed, anims);
        play(ring, RING, { duration: 190, delay: popTime + 16, easing: "cubic-bezier(.2,.7,.4,1)", fill: "forwards" }, speed, anims);
        drops.forEach((drop, k) => {
          const { a, d } = DROPLETS[k];
          const rad = (a * Math.PI) / 180;
          play(
            drop,
            [
              { opacity: 1, transform: "translate(-50%, -50%) translate(0, 0) scale(1)" },
              { opacity: 0, transform: `translate(-50%, -50%) translate(${Math.cos(rad) * d}em, ${Math.sin(rad) * d}em) scale(0.3)` },
            ],
            { duration: 220, delay: popTime + 10, easing: "cubic-bezier(.2,.7,.4,1)", fill: "forwards" },
            speed,
            anims,
          );
        });
      });
    }
    return () => anims.forEach((a) => a.cancel());
  }, [runKey, speed, reduced, popAt]);

  return (
    <span ref={root} className={`relative inline-block pl-[0.15em] ${className ?? ""}`} style={{ fontSize }}>
      {[...text].map((c, i) => (
        <span key={i} data-cell className="relative inline-block whitespace-pre">
          <span
            data-l
            className={`inline-block ${gradient ? "text-transparent" : ""}`}
            style={gradient ? { backgroundImage: gradient, backgroundClip: "text", WebkitBackgroundClip: "text" } : undefined}
          >
            {c}
          </span>
          <span
            data-ring
            className="pointer-events-none absolute top-1/2 left-1/2 size-[0.9em] rounded-full opacity-0"
            style={{ border: `0.03em solid ${accentB}` }}
          />
          {DROPLETS.map((_, k) => (
            <span
              key={k}
              data-drop
              className="pointer-events-none absolute top-1/2 left-1/2 size-[0.07em] rounded-full opacity-0"
              style={{ background: k % 2 ? accentB : accentA }}
            />
          ))}
        </span>
      ))}
    </span>
  );
}

export function PopText(props: ClipProps) {
  return (
    <h1 className="text-[9cqw] leading-none font-black tracking-[0.04em] whitespace-nowrap" style={{ color: "var(--stage-fg)" }}>
      <span className="sr-only">Explode</span>
      <span aria-hidden>
        <PopLetters
          {...props}
          text="Explode"
          popAt={700}
          gradient="var(--connectors-gradient)"
          className="!pl-0"
        />
      </span>
    </h1>
  );
}
