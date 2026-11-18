import { useEffect, useRef } from "react";
import { type ClipProps, IN_OUT, OUT, play } from "../../play";

export const CREST_ENTER_MS = 650;
export const GLINT_OFFSET_MS = 580;
export const GLINT_MS = 560;
const CREST_SRC = "/connectors/iq-crest.png";

// Figma frame 1135:1108: the crest is 360px on a 1920px frame (18.75cqw) with an 8px / 8px / 8px / 40% black shadow.
const SIZE = "18.75cqw";
const SHADOW = "drop-shadow(0.4167cqw 0.4167cqw 0.4167cqw rgb(0 0 0 / 0.4))";

// Rolls up into place like the words: a drum whose axis sits behind the face (half the crest's height), with a slight overshoot.
const ENTER: Keyframe[] = [
  { transform: "rotateX(-90deg)", offset: 0, easing: OUT },
  { transform: "rotateX(6deg)", offset: 0.7, easing: IN_OUT },
  { transform: "rotateX(0deg)", offset: 1 },
];

export function IqCrest({ runKey, speed, reduced, at }: ClipProps & { at: number }) {
  const logo = useRef<HTMLDivElement>(null);
  const glint = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const anims: Animation[] = [];
    if (reduced) {
      play(logo.current!, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: at, easing: "ease" }, speed, anims);
    } else {
      play(logo.current!, ENTER, { duration: CREST_ENTER_MS, delay: at, easing: "linear" }, speed, anims);
      play(logo.current!, [{ opacity: 0 }, { opacity: 1 }], { duration: 120, delay: at, easing: OUT }, speed, anims);
      // The band starts fully off the left edge and ends fully off the right; it only shows through the crest's own shape.
      play(glint.current!, [{ transform: "translateX(-65%)" }, { transform: "translateX(15%)" }], { duration: GLINT_MS, delay: at + GLINT_OFFSET_MS, easing: IN_OUT }, speed, anims);
    }
    return () => anims.forEach((a) => a.cancel());
  }, [runKey, speed, reduced, at]);

  return (
    <div aria-hidden style={{ gridArea: "1 / 1", zIndex: 20, width: SIZE, height: SIZE, filter: SHADOW, pointerEvents: "none" }}>
      <div style={{ width: "100%", height: "100%", perspective: "60cqw" }}>
        <div ref={logo} data-crest className="relative size-full" style={{ opacity: 0, willChange: "transform", transformOrigin: "50% 50% -9.375cqw", backfaceVisibility: "hidden" }}>
          <img alt="" src={CREST_SRC} className="block size-full max-w-none" />
          <span
            className="absolute inset-0 overflow-hidden"
            style={{ WebkitMaskImage: `url(${CREST_SRC})`, maskImage: `url(${CREST_SRC})`, WebkitMaskSize: "100% 100%", maskSize: "100% 100%" }}
          >
            <span
              ref={glint}
              data-glint
              className="absolute top-0 bottom-0 left-0"
              style={{
                width: "200%",
                transform: "translateX(-65%)",
                background: "linear-gradient(105deg, transparent 43%, rgb(255 255 255 / 0.9) 50%, transparent 57%)",
              }}
            />
          </span>
        </div>
      </div>
    </div>
  );
}
