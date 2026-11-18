export type ClipProps = { runKey: number; speed: number; reduced: boolean };

export const OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
export const IN_OUT = "cubic-bezier(0.77, 0, 0.175, 1)";
export const ROLL = "cubic-bezier(0.76, 0, 0.24, 1)";

// Reference frames are 1920 wide, so px / 19.2 gives cqw.
export const cq = (px: number) => `${px / 19.2}cqw`;

// Runs a WAAPI animation scaled by playback speed; pushes it to `bag` so callers can cancel on cleanup.
export function play(
  el: Element,
  keyframes: Keyframe[],
  opts: { duration: number; delay?: number; easing?: string; fill?: FillMode },
  speed: number,
  bag: Animation[],
) {
  const a = el.animate(keyframes, {
    duration: opts.duration / speed,
    delay: (opts.delay ?? 0) / speed,
    easing: opts.easing ?? OUT,
    fill: opts.fill ?? "both",
  });
  bag.push(a);
  return a;
}

// Schedules one animation at `delay` (ms, before speed). Sequences that build lots of animations take one of these, so
// a caller can line them all up on its own clock (see goFor).
export type Go = (el: Element, kf: Keyframe[], delay: number, duration: number, easing?: string) => void;
// "forwards", not "both": several animations run on one element in turn, and a later one filling backwards would override
// the earlier ones. `t0` starts them all on one timeline origin, for animations rebuilt after a refit.
export const goFor = (speed: number, reduced: boolean, anims: Animation[], t0: CSSNumberish | null = null, offset = 0): Go =>
  (el, kf, delay, duration, easing = "linear") => {
    const a = el.animate(kf, { duration: (reduced ? 1 : duration) / speed, delay: (offset + delay) / speed, easing, fill: "forwards" });
    if (t0 !== null) a.startTime = t0;
    anims.push(a);
  };

// Gathering speed into a snap.
export const BREATHE_EASE = "cubic-bezier(0.5, 0, 0.9, 0.6)";
// A spring in four keyframes: past the target, back a touch, then settled. Use SPRING for the offsets, springEase(k)
// for each keyframe's easing, and spring() for the values.
export const SPRING = [0, 0.62, 0.84, 1] as const;
export const SPRING_EASE = ["cubic-bezier(0.55, 0, 0.9, 0.5)", "cubic-bezier(0.2, 0.7, 0.4, 1)", "ease-in-out"] as const;
export const springEase = (k: number) => (k < SPRING_EASE.length ? { easing: SPRING_EASE[k] } : {});
// `floor` caps a shrinking value's overshoot to that fraction of its target, so a big squeeze can't go negative.
export const spring = (from: number, to: number, over: number, floor = 0) => {
  const past = Math.max(to + (to - from) * over, to * floor);
  return [from, past, to - (past - to) * 0.25, to];
};
