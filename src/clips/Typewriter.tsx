import { useEffect, useRef } from "react";
import type { ClipProps } from "../play";
const TEXT = "Ask anything about your data…";

export function Typewriter({ runKey, speed, reduced }: ClipProps) {
  const out = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = out.current!;
    if (reduced) {
      el.textContent = TEXT;
      return;
    }
    el.textContent = "";
    let i = 0;
    let tick: number | undefined;
    const t = window.setTimeout(() => {
      tick = window.setInterval(() => {
        el.textContent = TEXT.slice(0, ++i);        if (i >= TEXT.length) clearInterval(tick);
      }, 55 / speed);
    }, 500 / speed);
    return () => (clearTimeout(t), clearInterval(tick));
  }, [runKey, speed, reduced]);

  return (
    <div className="flex w-[70%] items-center gap-[1.5cqw] rounded-[1.6cqw] border px-[2.4cqw] py-[2cqw] text-[3.4cqw]" style={{ borderColor: "color-mix(in srgb, var(--stage-fg) 18%, transparent)", color: "var(--stage-fg)" }}>
      <span className="size-[2.6cqw] shrink-0 rounded-full bg-brand" />
      <span>
        <span ref={out} />
        <span className="ml-[0.1em] inline-block h-[1em] w-[0.08em] translate-y-[0.15em] bg-brand" style={{ animation: "caret 1s steps(1) infinite" }} />
      </span>
    </div>
  );
}
