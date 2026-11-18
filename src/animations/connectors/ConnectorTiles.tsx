import { useEffect, useRef } from "react";
import { type ClipProps, play } from "../../play";

const SRC = "/connectors/icons";

// The icons are the Figma exports with a fixed #FAFAFA fill, and the tile and label colours are fixed too, so the tiles
// look the same in both themes.
// Sizes are px / 19.2, in cqw. The tile is 260px (Figma has 200px) with a radius of 32px; the gap (24px), icon (80px),
// label (36px) and tracking (1.8px) are the Figma values.
export const TILE_PX = 260;
const TILES = [
  { label: "mail", icon: "tile-mail", inset: "16.67% 8.33%" },
  { label: "tasks", icon: "tile-tasks", inset: "0" },
  { label: "data", icon: "tile-data", inset: "12.5%" },
  { label: "events", icon: "tile-calendar", inset: "8.33%" },
];

// Left to right, each tile a little sooner after the last than the gap before it.
export const TILE_OFFSETS = [0, 100, 190, 270];
export const TILE_DROP_MS = 480;
// From the first tile starting to fall to the last one settling.
export const TILES_SETTLE_MS = TILE_OFFSETS[TILE_OFFSETS.length - 1] + TILE_DROP_MS;

// Tiles start 270% of their height above where they land. That is above the top of a 16:9 stage, so they enter from
// off-frame and are already moving fast when they reach the "all your" line on the way down.
const DROP_FROM = 2.7;
export const TILE_FALL_PX = DROP_FROM * TILE_PX;
const FALL_EASE = [0.5, 0, 0.9, 0.6] as const;

const bez = (a: number, b: number, u: number) => 3 * (1 - u) ** 2 * u * a + 3 * (1 - u) * u ** 2 * b + u ** 3;
const bezX = (u: number) => bez(FALL_EASE[0], FALL_EASE[2], u);
const bezY = (u: number) => bez(FALL_EASE[1], FALL_EASE[3], u);
const bisect = (f: (u: number) => number, target: number) => {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};

// The fall is the first half of the keyframes, so it takes half the drop duration.
export const TILE_FALL_MS = TILE_DROP_MS * 0.5;

// Milliseconds after a tile starts falling at which it has dropped `px`.
export const fallenAtMs = (px: number) => bezX(bisect(bezY, px / TILE_FALL_PX)) * TILE_FALL_MS;

// How far a tile has dropped `ms` after it starts falling.
export const fallenPxAtMs = (ms: number) => bezY(bisect(bezX, Math.min(Math.max(ms / TILE_FALL_MS, 0), 1))) * TILE_FALL_PX;

// Falls under gravity (ease-in), squashes on impact, rebounds a little, settles. Each segment's easing is set on the
// keyframe that starts it, so the effect-level easing must stay linear.
const DROP: Keyframe[] = [
  { transform: `translateY(-${DROP_FROM * 100}%) scale(1, 1)`, offset: 0, easing: `cubic-bezier(${FALL_EASE.join(",")})` },
  { transform: "translateY(0) scale(1.07, 0.9)", offset: 0.5, easing: "cubic-bezier(.2,.7,.4,1)" },
  { transform: "translateY(-9%) scale(0.99, 1.025)", offset: 0.72, easing: "cubic-bezier(.55,0,.85,.45)" },
  { transform: "translateY(0) scale(1.03, 0.955)", offset: 0.89, easing: "cubic-bezier(.2,.7,.4,1)" },
  { transform: "translateY(0) scale(1, 1)", offset: 1 },
];

// The ground shadow follows the same offsets: faint and tight while the tile is high, darkest and widest at impact,
// pulling in and fading as the tile lifts on the bounce, then settling to a soft resting ellipse.
const SHADOW_REST = 0.22;
const SHADOW: Keyframe[] = [
  { opacity: 0, transform: "scale(0.5, 0.5)", offset: 0, easing: "cubic-bezier(.5,0,.9,.6)" },
  { opacity: 0, transform: "scale(0.6, 0.6)", offset: 0.3, easing: "cubic-bezier(.5,0,.9,.6)" },
  { opacity: SHADOW_REST * 1.3, transform: "scale(1.08, 1.05)", offset: 0.5, easing: "cubic-bezier(.2,.7,.4,1)" },
  { opacity: SHADOW_REST * 0.65, transform: "scale(0.88, 0.85)", offset: 0.72, easing: "cubic-bezier(.55,0,.85,.45)" },
  { opacity: SHADOW_REST * 1.1, transform: "scale(1.03, 1.02)", offset: 0.89, easing: "cubic-bezier(.2,.7,.4,1)" },
  { opacity: SHADOW_REST, transform: "scale(1, 1)", offset: 1 },
];

export function ConnectorTiles({ runKey, speed, reduced, startAt }: ClipProps & { startAt: number }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tiles = [...root.current!.querySelectorAll<HTMLElement>("[data-tile]")];
    const shadows = [...root.current!.querySelectorAll<HTMLElement>("[data-shadow]")];
    const anims: Animation[] = [];
    tiles.forEach((el, i) => {
      const delay = startAt + TILE_OFFSETS[i];
      if (reduced) {
        play(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay, easing: "ease" }, speed, anims);
        play(shadows[i], [{ opacity: 0 }, { opacity: SHADOW_REST }], { duration: 300, delay, easing: "ease" }, speed, anims);
      } else {
        play(el, DROP, { duration: TILE_DROP_MS, delay, easing: "linear" }, speed, anims);
        play(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 60, delay, easing: "linear" }, speed, anims);
        play(shadows[i], SHADOW, { duration: TILE_DROP_MS, delay, easing: "linear" }, speed, anims);
      }
    });
    return () => anims.forEach((a) => a.cancel());
  }, [runKey, speed, reduced, startAt]);

  return (
    <div ref={root} className="flex" style={{ gridArea: "1 / 1", gap: "1.25cqw" }}>
      {TILES.map(({ label, icon, inset }) => (
        <div key={label} className="relative" style={{ width: `${TILE_PX / 19.2}cqw`, height: `${TILE_PX / 19.2}cqw` }}>
          {/* Ground contact shadow: an ellipse centred on the tile's bottom edge, so half of it is tucked under the tile. */}
          <span
            aria-hidden
            data-shadow
            className="pointer-events-none absolute opacity-0"
            style={{
              left: "4%",
              right: "4%",
              bottom: "-0.9cqw",
              height: "1.8cqw",
              borderRadius: "50%",
              background: "radial-gradient(closest-side, rgb(0 0 0 / 0.9), rgb(0 0 0 / 0.45) 55%, transparent)",
              filter: "blur(0.25cqw)",
              transformOrigin: "50% 50%",
            }}
          />
          <div
            data-tile
            className="relative flex size-full flex-col items-center justify-center opacity-0"
            style={{
              gap: "0.4167cqw",
              borderRadius: "1.6667cqw",
              transformOrigin: "50% 100%",
              background: `var(--tile-${label})`,
              color: `var(--tile-${label}-fg)`,
            }}
          >
            <div className="relative" style={{ width: "4.1667cqw", height: "4.1667cqw" }}>
              <span className="absolute" style={{ inset }}>
                <img alt="" src={`${SRC}/${icon}.svg`} className="block size-full max-w-none" />
              </span>
            </div>
            <span className="font-geist whitespace-nowrap" style={{ fontSize: "1.875cqw", letterSpacing: "0.09375cqw" }}>
              {label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
