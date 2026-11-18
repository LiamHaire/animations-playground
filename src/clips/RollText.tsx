import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { type ClipProps, ROLL, play } from "../play";
type RollTextProps = ClipProps & {
  text: string;
  children?: ReactNode;
  startDelay?: number;
  outAt?: number;
  duration?: number;
  outDuration?: number;
  dir?: "up" | "down"; // up: comes up from below and leaves over the top; down: the reverse
  className?: string;
  style?: CSSProperties;
};

export function RollText({ runKey, speed, reduced, text, children, startDelay = 300, outAt, duration = 340, outDuration = duration, dir = "up", className, style }: RollTextProps) {
  const face = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = face.current!;
    const anims: Animation[] = [];
    const turn = dir === "up" ? 90 : -90;
    const into =reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: `rotateX(${-turn}deg)` }, { transform: "rotateX(0deg)" }];
    const away = reduced ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: "rotateX(0deg)" }, { transform: `rotateX(${turn}deg)` }];
    const easing = reduced ? "ease" : ROLL;
    play(el, into, { duration: reduced ? 300 : duration, delay: startDelay, easing }, speed, anims);    if (outAt !== undefined) {
      play(el, away, { duration: reduced ? 300 : outDuration, delay: outAt, easing, fill: "forwards" }, speed, anims);
    }
    return () => anims.forEach((a) => a.cancel());
  }, [runKey, speed, reduced, startDelay, outAt, duration, outDuration, dir]);

  return (
    <div style={{ display: "grid", placeItems: "center", perspective: "75cqw", gridArea: "1 / 1" }}>
      <span className="sr-only">{text}</span>
      <span
        ref={face}
        aria-hidden
        className={className}
        style={{
          display: "block",
          whiteSpace: "nowrap",
          transformOrigin: "50% 50% -0.55em",
          backfaceVisibility: "hidden",
          willChange: "transform",
          ...style,
        }}
      >
        {children ?? text}
      </span>
    </div>
  );
}
