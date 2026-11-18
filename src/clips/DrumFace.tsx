import { type ReactNode, useEffect, useRef } from "react";
import { type ClipProps, ROLL, play } from "../play";

type DrumFaceProps = ClipProps & {
  role: "in" | "out";
  dir?: "down" | "up";
  at: number;
  ms?: number;
  radius: string; // CSS length from the face to the axis it rolls around
  children: ReactNode;
};

// One face of a drum rolling about a horizontal axis `radius` behind it. Put an "in" face and an "out" face with the
// same timing inside one perspective container: the incoming face stays 90 degrees behind the outgoing one, so it
// pushes it off. Going down, the incoming face starts above and the outgoing face leaves below.
export function DrumFace({ runKey, speed, reduced, role, dir = "down", at, ms = 480, radius, children }: DrumFaceProps) {
  const el = useRef<HTMLDivElement>(null);
  const incoming = role === "in";

  useEffect(() => {
    const anims: Animation[] = [];
    const s = dir === "down" ? 1 : -1;
    const vis = incoming ? ["hidden", "visible"] : ["visible", "hidden"];
    const keyframes: Keyframe[] = reduced
      ? [
          { opacity: incoming ? 0 : 1, visibility: vis[0] },
          { opacity: incoming ? 1 : 0, visibility: vis[1] },
        ]
      : [
          { transform: incoming ? `rotateX(${90 * s}deg)` : "rotateX(0deg)", visibility: vis[0] },
          { transform: incoming ? "rotateX(0deg)" : `rotateX(${-90 * s}deg)`, visibility: vis[1] },
        ];
    play(el.current!, keyframes, { duration: reduced ? 300 : ms, delay: at, easing: reduced ? "ease" : ROLL }, speed, anims);
    return () => anims.forEach((a) => a.cancel());
  }, [runKey, speed, reduced, incoming, dir, at, ms]);

  return (
    <div
      ref={el}
      data-drum={role}
      style={{
        gridArea: "1 / 1",
        transformOrigin: `50% 50% -${radius}`,
        backfaceVisibility: "hidden",
        willChange: "transform",
        visibility: incoming ? "hidden" : undefined,
      }}
    >
      {children}
    </div>
  );
}
