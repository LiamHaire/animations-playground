import { useEffect, useRef } from "react";
import type { ClipProps } from "../play";
const TEXT = "Real-time collaboration";
const SYMBOLS = "#$%&*+=<>/\\|?!~^@";

export function GlitchDecode({ runKey, speed, reduced }: ClipProps) {
  const root = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const chars = [...root.current!.querySelectorAll<HTMLElement>("[data-c]")];
    chars.forEach((c) => (c.textContent = reduced ? c.dataset.c! : " "));
    if (reduced) return;
    const timers: number[] = [];
    chars.forEach((c, i) => {
      const orig = c.dataset.c!;
      if (orig.trim() === "") return;
      const start = (300 + i * 45) / speed;
      const end = (300 + i * 45 + 380 + ((i * 53) % 220)) / speed;
      timers.push(
        window.setTimeout(() => {
          const tick = window.setInterval(() => (c.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]), 55 / speed);
          timers.push(tick);
          timers.push(
            window.setTimeout(() => {
              clearInterval(tick);
              c.textContent = orig;            }, end - start),
          );
        }, start),
      );
    });
    return () => {
      timers.forEach((t) => (clearTimeout(t), clearInterval(t)));
      chars.forEach((c) => (c.textContent = c.dataset.c!));
    };
  }, [runKey, speed, reduced]);

  return (
    <h1 ref={root} className="font-mono text-[5.4cqw] font-medium whitespace-nowrap" style={{ color: "var(--stage-fg)" }} aria-label={TEXT}>
      {[...TEXT].map((c, i) => (
        <span key={i} data-c={c} className="inline-block w-[0.62em] text-center whitespace-pre">{c}</span>
      ))}
    </h1>
  );
}
