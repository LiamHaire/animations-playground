import { useEffect, useRef } from "react";
import { type ClipProps, OUT, play } from "../play";
const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

export function IconBurst({ runKey, speed, reduced }: ClipProps) {
  const root = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = root.current!;
    const star = svg.querySelector<SVGElement>("[data-star]")!;
    const rays = [...svg.querySelectorAll<SVGElement>("[data-ray]")];
    const anims: Animation[] = [];
    if (reduced) {
      play(star, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: "ease" }, speed, anims);
    } else {
      play(
        star,
        [
          { scale: "0.6", opacity: 0, rotate: "-20deg" },
          { scale: "1.12", opacity: 1, rotate: "4deg", offset: 0.65 },
          { scale: "1", opacity: 1, rotate: "0deg" },
        ],
        { duration: 600, delay: 250 },
        speed,
        anims,
      );
      rays.forEach((r, i) =>
        play(
          r,
          [
            { strokeDashoffset: 1, opacity: 1, offset: 0 },
            { strokeDashoffset: 0, opacity: 1, offset: 0.55 },
            { strokeDashoffset: -1, opacity: 0 },
          ],
          { duration: 520, delay: 250 + 460 + i * 40, easing: OUT },
          speed,
          anims,
        ),
      );
    }
    return () => anims.forEach((a) => a.cancel());
  }, [runKey, speed, reduced]);

  return (
    <svg ref={root} viewBox="-60 -60 120 120" className="size-[30cqw]" fill="none">
      {RAYS.map((deg) => (
        <line
          key={deg}
          data-ray
          pathLength={1}
          strokeDasharray="1 1"
          x1="0" y1="-38" x2="0" y2="-52"
          transform={`rotate(${deg})`}
          stroke="var(--color-brand)"
          strokeWidth="3.5"
          strokeLinecap="round"
          style={{ opacity: 0 }}
        />
      ))}
      <path
        data-star
        d="M0 -28 L8 -9 L28 -7 L12 6 L17 26 L0 15 L-17 26 L-12 6 L-28 -7 L-8 -9 Z"
        fill="var(--color-brand)"
        style={{ opacity: 0, transformOrigin: "center", transformBox: "fill-box" }}
      />
    </svg>
  );
}
