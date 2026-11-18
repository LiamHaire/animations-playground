import { useEffect, useRef } from "react";
import { type ClipProps, IN_OUT, OUT, play } from "../play";
export function DrawCheck({ runKey, speed, reduced }: ClipProps) {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current!;
    const svg = el.querySelector<SVGSVGElement>("svg")!;
    const circle = el.querySelector<SVGPathElement>("[data-circle]")!;
    const check = el.querySelector<SVGPathElement>("[data-check]")!;
    const label = el.querySelector<HTMLElement>("[data-label]")!;
    const anims: Animation[] = [];
    const draw =(p: SVGPathElement, duration: number, delay: number, easing: string) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = `${len}`;
      play(p, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration, delay, easing }, speed, anims);
    };
    if (reduced) {
      play(svg, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: "ease" }, speed, anims);
      play(label, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: "ease" }, speed, anims);
    } else {
      draw(circle, 700, 250, IN_OUT);
      draw(check, 380, 250 + 700 - 80, OUT);      play(svg, [{ scale: "1" }, { scale: "1.08", offset: 0.5 }, { scale: "1" }], { duration: 300, delay: 250 + 700 + 200 }, speed, anims);
      play(label, [{ opacity: 0, translate: "0 8px" }, { opacity: 1, translate: "0 0" }], { duration: 500, delay: 250 + 700 + 150 }, speed, anims);
    }
    return () => anims.forEach((a) => a.cancel());
  }, [runKey, speed, reduced]);

  return (
    <div ref={wrap} className="flex flex-col items-center gap-[2cqw]">
      <svg viewBox="0 0 120 120" className="size-[22cqw]" fill="none" stroke="var(--color-brand)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <path data-circle d="M60 8a52 52 0 1 1 0 104a52 52 0 1 1 0-104" />
        <path data-check d="M36 62l16 16l32-34" />
      </svg>
      <p data-label className="text-[3.2cqw] font-medium opacity-0" style={{ color: "var(--stage-fg)" }}>Changes saved</p>
    </div>
  );
}
