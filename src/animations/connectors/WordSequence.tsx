import { useEffect, useRef } from "react";
import { type ClipProps, ROLL, play } from "../../play";

const BLUR = "blur(0.6cqw)";
// Sharper than IN_OUT: it leaves quickly and brakes hard at the end.
const WIPE_EASE = "cubic-bezier(0.7, 0, 0.15, 1)";

const OPEN = "inset(-50% -10% -50% -10%)";
const HIDDEN_LEFT_END = "inset(-50% 110% -50% -10%)";
const HIDDEN_RIGHT_END = "inset(-50% -10% -50% 110%)";

type Props = ClipProps & {
  words: [string, string, string];
  at: number;
  step: number;
  rollInMs: number;
  wipeMs: number;
  rollOutMs: number;
  className: string;
  textShadow: string;
};

// First word rolls up, then each next word wipes in over the last (left, then right), and the last rolls away.
// Both edges of a wipe share one easing and duration, so they stay together; the layers share one box so the edge lines up.
export function WordSequence({ runKey, speed, reduced, words, at, step, rollInMs, wipeMs, rollOutMs, className, textShadow }: Props) {
  const layers = useRef<(HTMLDivElement | null)[]>([]);
  const faces = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const [a, b, c] = layers.current as HTMLDivElement[];
    const [fa, , fc] = faces.current as HTMLSpanElement[];
    const anims: Animation[] = [];
    const t1 = at + step;
    const t2 = at + 2 * step;
    const t3 = at + 3 * step;

    if (reduced) {
      const fade = (el: HTMLElement, from: number, to: number, delay: number, fill: FillMode) =>
        play(el, [{ opacity: from }, { opacity: to }], { duration: 300, delay, easing: "ease", fill }, speed, anims);
      fade(a, 0, 1, at, "both");
      fade(a, 1, 0, t1, "forwards");
      fade(b, 0, 1, t1, "both");
      fade(b, 1, 0, t2, "forwards");
      fade(c, 0, 1, t2, "both");
      fade(c, 1, 0, t3, "forwards");
    } else {
      play(fa, [{ transform: "rotateX(-90deg)" }, { transform: "rotateX(0deg)" }], { duration: rollInMs, delay: at, easing: ROLL }, speed, anims);
      // The outgoing word blurs as the edge takes it; the incoming word sharpens as it is revealed.
      const wipe = (el: HTMLElement, from: string, to: string, delay: number, fill: FillMode, blurFrom: string, blurTo: string) =>
        play(
          el,
          [
            { clipPath: from, filter: blurFrom },
            { clipPath: to, filter: blurTo },
          ],
          { duration: wipeMs, delay, easing: WIPE_EASE, fill },
          speed,
          anims,
        );
      // Wipe left: the edge travels right to left.
      wipe(a, OPEN, HIDDEN_LEFT_END, t1, "forwards", "blur(0)", BLUR);
      wipe(b, HIDDEN_RIGHT_END, OPEN, t1, "both", BLUR, "blur(0)");
      // Wipe right: the edge travels left to right.
      wipe(b, OPEN, HIDDEN_RIGHT_END, t2, "forwards", "blur(0)", BLUR);
      wipe(c, HIDDEN_LEFT_END, OPEN, t2, "both", BLUR, "blur(0)");
      play(fc, [{ transform: "rotateX(0deg)" }, { transform: "rotateX(90deg)" }], { duration: rollOutMs, delay: t3, easing: ROLL, fill: "forwards" }, speed, anims);
    }
    return () => anims.forEach((x) => x.cancel());
  }, [runKey, speed, reduced, at, step, rollInMs, wipeMs, rollOutMs]);

  const initial = [OPEN, HIDDEN_RIGHT_END, HIDDEN_LEFT_END];

  return (
    <div style={{ display: "grid", perspective: "75cqw" }}>
      <span className="sr-only">{words.join(", ")}</span>
      {words.map((w, i) => (
        <div
          key={w}
          ref={(el) => {
            layers.current[i] = el;
          }}
          aria-hidden
          style={{ gridArea: "1 / 1", display: "grid", placeItems: "center", clipPath: initial[i], opacity: reduced ? 0 : undefined }}
        >
          <span
            ref={(el) => {
              faces.current[i] = el;
            }}
            className={className}
            style={{
              display: "block",
              whiteSpace: "nowrap",
              transformOrigin: "50% 50% -0.55em",
              backfaceVisibility: "hidden",
              willChange: "transform",
              textShadow,
              transform: i === 0 ? "rotateX(-90deg)" : undefined,
            }}
          >
            {w}
          </span>
        </div>
      ))}
    </div>
  );
}
