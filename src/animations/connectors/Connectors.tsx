import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { type ClipProps, IN_OUT, play } from "../../play";
import { TypeText, typeEndMs } from "../../clips/TypeText";
import { SlideText, slideTextMs } from "../../clips/SlideText";
import { ICON_POP_MS, ConnectorIcons } from "./ConnectorIcons";
import { ConnectorTiles, TILE_DROP_MS, TILE_FALL_MS, TILE_FALL_PX, TILE_OFFSETS, TILE_PX, TILES_SETTLE_MS, fallenAtMs, fallenPxAtMs } from "./ConnectorTiles";
import { DrumFace } from "../../clips/DrumFace";
import { LiftWords } from "../../clips/LiftWords";
import { FLOOD_MS, FLOOD_OFFSET_MS, PRESS_DOWN_MS, PressFlood } from "../../clips/PressFlood";
import { CREST_ENTER_MS, GLINT_MS, GLINT_OFFSET_MS, IqCrest } from "./IqCrest";
import { FloodTint } from "./FloodTint";
import { POP_LEAD, popOffset } from "../../clips/PopText";
import { ConnectorsWord } from "./ConnectorsWord";
import { WordSequence } from "./WordSequence";
import { type Cue, type Voice, playNow, ratchet, useSfx } from "../../sfx";

// Reference frames are 1920 wide, so sizes are px / 19.2 in cqw: 64px = 3.333, 40px = 2.083.
const INTRO_START = 500; // blank frame first, then the caret appears
const INTRO_PACE = 0.28; // typing speed multiplier (the portfolio's value is 0.42; lower is faster)
// The move starts a beat after the caret has faded, so a faster type-on brings everything after it forward too.
const MOVE_AT = typeEndMs("introducing", INTRO_START, INTRO_PACE) + 60;
const MOVE_MS = 600;
const ROLL_AT = MOVE_AT + 150; // CONNECTORS rolls in while the intro is still travelling
const POP_AT = ROLL_AT + 340 + 650; // roll lands, then a beat to read the word before it inflates

// Icon i appears just after the letter at the same point along the row has popped.
const ICON_COUNT = 9;
const iconTime = (i: number) => POP_AT + POP_LEAD + popOffset((i * 9) / (ICON_COUNT - 1)) + 70;

// The finished icon row holds, then the whole scene wipes out to the left.
const ICONS_DONE = iconTime(ICON_COUNT - 1) + ICON_POP_MS;
const HOLD_MS = 800;
const WIPE_AT = ICONS_DONE + HOLD_MS;
const WIPE_MS = 560;
// "all your" starts 45% of the way through the wipe. The clip is measured against the content-sized wrapper, and at 45%
// the edge is still about two-thirds of the way across it, so the text begins to appear slightly before the edge reaches the centre.
const TEXT_AT = WIPE_AT + WIPE_MS * 0.45;

// "all your" arrives, holds at full size in the middle of the frame, then the tiles knock it out. It sits across the gap
// between the tasks tile (index 1) and the data tile, so the tasks tile, which falls first, strikes it. KNOCK_AT is the
// moment that tile's bottom edge meets the top of the text, and the tiles' start time is worked back from it using the
// tile's own fall curve.
const YOUR_HOLD_MS = 600;
const KNOCK_AT = TEXT_AT + slideTextMs(2) + YOUR_HOLD_MS;
const YOUR_HALF_PX = 32; // the 64px line, centred on the middle of the frame
const CONTACT_PX = TILE_FALL_PX - TILE_PX / 2 - YOUR_HALF_PX; // how far the tile has fallen when its edge meets the text
const CONTACT_MS = fallenAtMs(CONTACT_PX);
const TILES_AT = KNOCK_AT - TILE_OFFSETS[1] - CONTACT_MS;

// Struck, the text is driven down by the tile's edge (it stays just under it until the tile lands), then carries on out
// of the bottom of the frame under its own momentum, tipping left side first as it goes.
const PUSH_MS = TILE_FALL_MS - CONTACT_MS; // from the strike to the tile landing
const PUSH_PX = TILE_PX / 2 + YOUR_HALF_PX; // how far the edge drives it
const EXIT_MS = 320;
const EXIT_PX = 520;
const KNOCK_TOTAL_MS = PUSH_MS + EXIT_MS;
const cq = (n: number) => `${n / 19.2}cqw`;
const knockFrame = (ms: number, y: number, deg: number): Keyframe => ({
  offset: ms / KNOCK_TOTAL_MS,
  transform: `translateY(${cq(y)}) rotate(${deg}deg)`,
});
const KNOCK_FRAMES: Keyframe[] = [
  // Pushed: sampled from the tile's own fall so the text rides exactly on its bottom edge.
  ...Array.from({ length: 7 }, (_, k) => {
    const t = (PUSH_MS * k) / 6;
    return knockFrame(t, fallenPxAtMs(CONTACT_MS + t) - CONTACT_PX, -9 * (t / PUSH_MS));
  }),
  // Carried: starts at the speed it was pushed and slows.
  ...Array.from({ length: 8 }, (_, k) => {
    const s = (k + 1) / 8;
    const slow = 1 - (1 - s) ** 2;
    return knockFrame(PUSH_MS + EXIT_MS * s, PUSH_PX + EXIT_PX * slow, -9 - 9 * slow);
  }),
];

// The text is fully faded once it is FADE_END_Y_PX below the middle of the frame, well before it reaches the bottom edge
// (540px down; the tilted text is about 115px tall by then). That position is mapped back to a time on the exit curve above.
const FADE_END_Y_PX = 400;
const FADE_END_S = 1 - Math.sqrt(1 - (FADE_END_Y_PX - PUSH_PX) / EXIT_PX);
const FADE_MS = PUSH_MS + EXIT_MS * FADE_END_S;

// CONNECTORS stays centred at 540px in the 1080px frame. "introducing" settles at 40px with its bottom edge 22px
// above CONNECTORS' top edge, so its centre ends 42px + half the CONNECTORS size above the middle.
const CONNECTORS_PX = 144;
const CAP_HEIGHT_PX = 107; // Satoshi Black cap height at 144px; the icons match this
const SETTLE_PX = 42 + CONNECTORS_PX / 2;

// The vertical insets are generous so the pop's rings and droplets are never clipped before the wipe starts.
const WIPE_OPEN = "inset(-200% -10% -200% -10%)";
const WIPE_CLOSED = "inset(-200% 110% -200% -10%)";

const px = (n: number) => `${n / 19.2}cqw`;

// The tiles hold, then roll down and off (a drum face whose axis sits half a tile height behind it). "IN ONE PLACE"
// lifts in word by word as they clear, starting when the tiles are about halfway out.
const TILES_HOLD_MS = 800;
const DRUM_AT = TILES_AT + TILES_SETTLE_MS + TILES_HOLD_MS;
const DRUM_MS = 330;
const DRUM_RADIUS = px(TILE_PX / 2);
const WORDS_AT = DRUM_AT + 170;
const WORDS_STEP_MS = 55;
const WORDS_LIFT_MS = 270;

// "IN ONE PLACE" holds for a beat, then the PLACE box is pressed down and pops back up, flooding the frame with orange.
// The IQ crest arrives a beat after the flood has covered the frame.
const PLACE_LANDED_MS = WORDS_AT + 2 * WORDS_STEP_MS + WORDS_LIFT_MS;
const PRESS_HOLD_BEFORE_MS = 700;
const PRESS_AT = PLACE_LANDED_MS + PRESS_HOLD_BEFORE_MS;
// Once the flood has covered the frame, white words roll up one after another on the orange, then the last rolls away as the crest rolls up.
const FLOOD_DONE_MS = PRESS_AT + FLOOD_OFFSET_MS + FLOOD_MS;
// CONNECTED rolls up, TRUSTED wipes in from the right (edge travels left), INTELLIGENT wipes in from the left (edge travels right),
// then INTELLIGENT rolls away. Each word starts one step after the last.
const WORD_START_MS = FLOOD_DONE_MS + 440;
const WORD_STEP_MS = 680;
const WORD_ROLL_IN_MS = 340;
const WORD_WIPE_MS = 300;
const WORD_OUT_MS = 260;
const CREST_AT = WORD_START_MS + 3 * WORD_STEP_MS + WORD_OUT_MS + 80;
// The flood eases from the PLACE orange to its final orange starting 40% of the way through, over 450ms (see PressFlood).
// The tint fades in over the same stretch so the two read as one change.
const TINT_AT = PRESS_AT + FLOOD_OFFSET_MS + FLOOD_MS * 0.4;
const TINT_MS = 450;

// Sound cue sheet: every time is ms from the start at 1x, built from the constants above so it follows any timing change.
// The typing clacks are not here, they fire from TypeText as each letter appears (its timing is jittered per run).
// Voices are mostly clicks, clacks, thocks and ticks, not swooshes. See src/sfx.ts for how each voice is made.
const cue = (at: number, voice: Voice, gain = 1, pitch = 1): Cue => ({ at, voice, gain, pitch });
const T1 = WORD_START_MS + WORD_STEP_MS; // CONNECTED -> TRUSTED wipe
const T2 = WORD_START_MS + 2 * WORD_STEP_MS; // TRUSTED -> INTELLIGENT wipe
const T3 = WORD_START_MS + 3 * WORD_STEP_MS; // INTELLIGENT rolls away
const CONNECTORS_LETTERS = 10;
const SOUND: Cue[] = [
  // "introducing" moves up and CONNECTORS rolls in and lands.
  cue(MOVE_AT, "click", 0.5, 0.9),
  cue(ROLL_AT + 330, "clack", 0.8),
  // Inflate: ticks that rise and speed up, then one click per letter pop, climbing in pitch, then an icon key for each icon.
  ...ratchet(POP_AT, POP_LEAD - 20, 9, 0.86, "tick", 0.55, 0.85, 0.07),
  ...Array.from({ length: CONNECTORS_LETTERS }, (_, i) => cue(POP_AT + POP_LEAD + popOffset(i), "click", 0.9, 0.9 + i * 0.045)),
  ...Array.from({ length: ICON_COUNT }, (_, i) => cue(iconTime(i), "key", 0.5, 1.3)),
  // Wipe out, then "all your" lands word by word.
  cue(WIPE_AT, "clack", 1, 0.85),
  cue(WIPE_AT + WIPE_MS, "click", 0.6),
  cue(TEXT_AT + 200, "tick", 0.5, 0.9),
  cue(TEXT_AT + 340, "tick", 0.5, 1.1),
  // Tiles: a thud as each lands and a small thock on the bounce's second touch. The knock is the first tile striking the text.
  ...TILE_OFFSETS.flatMap((off, i) => [
    cue(TILES_AT + off + TILE_FALL_MS, "thud", 0.85, 1 + i * 0.07),
    cue(TILES_AT + off + TILE_DROP_MS * 0.89, "thock", 0.3, 1.5),
  ]),
  cue(KNOCK_AT, "clack", 1, 0.8),
  // Tiles roll off, IN ONE PLACE lifts in word by word.
  cue(DRUM_AT, "clack", 0.7, 0.9),
  cue(DRUM_AT + DRUM_MS, "click", 0.6, 0.9),
  ...[0, 1, 2].map((i) => cue(WORDS_AT + i * WORDS_STEP_MS + 60, "key", 0.7, 0.95 + i * 0.1)),
  // PLACE pressed down, released (click), and the flood fills with ticks that speed up, ending on a thud.
  cue(PRESS_AT + PRESS_DOWN_MS, "thock", 0.9),
  cue(PRESS_AT + FLOOD_OFFSET_MS, "click", 0.9, 1.3),
  ...ratchet(PRESS_AT + FLOOD_OFFSET_MS, FLOOD_MS, 14, 0.82, "tick", 0.45, 1, 0.05),
  cue(FLOOD_DONE_MS, "thud", 0.8, 0.9),
  // CONNECTED lands, each wipe is a clack at its start and a tick as it settles, INTELLIGENT clicks away.
  cue(WORD_START_MS + WORD_ROLL_IN_MS - 40, "clack", 0.7, 1),
  cue(T1, "clack", 0.8, 1.1),
  cue(T1 + WORD_WIPE_MS, "tick", 0.6, 1.1),
  cue(T2, "clack", 0.8, 1.25),
  cue(T2 + WORD_WIPE_MS, "tick", 0.6, 1.25),
  cue(T3 + WORD_OUT_MS - 40, "click", 0.7, 1.2),
  // Crest: a thock as it nears its overshoot, a click as it settles, then ticks that quicken across the shimmer and a ping at its end.
  cue(CREST_AT + CREST_ENTER_MS * 0.7, "thock", 0.7, 1.2),
  cue(CREST_AT + CREST_ENTER_MS, "click", 0.7, 1.1),
  ...ratchet(CREST_AT + GLINT_OFFSET_MS, GLINT_MS, 8, 0.8, "tick", 0.35, 1.6, 0.1),
  cue(CREST_AT + GLINT_OFFSET_MS + GLINT_MS, "ping", 0.8),
];

// Moves a line of 64px text up by `rise` px (in the 1080px frame) while shrinking it to 40px.
function Settle({ runKey, speed, reduced, at, rise, children }: ClipProps & { at: number; rise: number; children: ReactNode }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anims: Animation[] = [];
    play(
      el.current!,
      [{ transform: "translateY(0) scale(1)" }, { transform: `translateY(${-rise / 19.2}cqw) scale(0.625)` }],
      { duration: reduced ? 1 : MOVE_MS, delay: at, easing: IN_OUT },
      speed,
      anims,
    );
    return () => anims.forEach((a) => a.cancel());
  }, [runKey, speed, reduced, at, rise]);

  return <div ref={el} style={{ gridArea: "1 / 1", transformOrigin: "50% 50%" }}>{children}</div>;
}

// Knocked down and out of the frame. The keyframes are sampled, so the easing between them is linear.
function KnockOut({ runKey, speed, reduced, at, children }: ClipProps & { at: number; children: ReactNode }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anims: Animation[] = [];
    if (reduced) {
      play(el.current!, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, delay: at, easing: "ease", fill: "forwards" }, speed, anims);
    } else {
      play(el.current!, KNOCK_FRAMES, { duration: KNOCK_TOTAL_MS, delay: at, easing: "linear", fill: "forwards" }, speed, anims);
      play(el.current!, [{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, delay: at, easing: "linear", fill: "forwards" }, speed, anims);
    }
    return () => anims.forEach((a) => a.cancel());
  }, [runKey, speed, reduced, at]);

  return <div ref={el} style={{ gridArea: "1 / 1" }}>{children}</div>;
}

// Hard-edged mask whose edge travels right to left, erasing everything inside it.
function WipeOut({ runKey, speed, reduced, children }: ClipProps & { children: ReactNode }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anims: Animation[] = [];
    if (reduced) {
      play(el.current!, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: WIPE_AT, easing: "ease" }, speed, anims);
    } else {
      play(el.current!, [{ clipPath: WIPE_OPEN }, { clipPath: WIPE_CLOSED }], { duration: WIPE_MS, delay: WIPE_AT, easing: IN_OUT }, speed, anims);
    }
    return () => anims.forEach((a) => a.cancel());
  }, [runKey, speed, reduced]);

  return <div ref={el} style={{ gridArea: "1 / 1" }}>{children}</div>;
}

export function Connectors(props: ClipProps) {
  const iconAt = useCallback((i: number) => iconTime(i), []);
  useSfx(SOUND, props);

  return (
    <div className="grid place-items-center">
      {/* Before the tiles in the DOM so the tiles paint over it. */}
      <KnockOut {...props} at={KNOCK_AT}>
        <SlideText
          {...props}
          text="all your"
          startDelay={TEXT_AT}
          className="font-geist text-[3.333cqw] leading-none font-normal whitespace-nowrap text-muted-foreground"
        />
      </KnockOut>
      <div style={{ gridArea: "1 / 1", display: "grid", placeItems: "center", perspective: "75cqw" }}>
        <DrumFace {...props} role="out" at={DRUM_AT} ms={DRUM_MS} radius={DRUM_RADIUS}>
          <ConnectorTiles {...props} startAt={TILES_AT} />
        </DrumFace>
        {/* Figma frame 1123:1042: 96px Satoshi Bold, 14.4px tracking. PLACE sits in an orange/600 box, 32px x 24px padding
            around a 130px line, 8px radius, 24px from "ONE". Em values below are those px / 96. The vertical padding is
            set for this 96px line box so the box comes out 178px tall. Figma's text boxes leave out the trailing
            letter-spacing and space, which CSS keeps, so "ONE" has no trailing space and PLACE's right padding is
            32px minus the 14.4px of tracking after its last letter. */}
        <h1 className="font-display z-10 flex items-center text-[5cqw] leading-none font-bold tracking-[0.15em] whitespace-nowrap text-foreground" style={{ gridArea: "1 / 1" }}>
          <span className="sr-only">IN ONE PLACE</span>
          <LiftWords {...props} at={WORDS_AT} step={WORDS_STEP_MS} ms={WORDS_LIFT_MS}>
            {[
              "IN ",
              "ONE",
              <PressFlood key="place" {...props} at={PRESS_AT} className="ml-[0.25em] flex items-center rounded-[0.0833em] py-[0.4271em] pr-[0.1833em] pl-[0.3333em] text-primary-foreground">
                PLACE
              </PressFlood>,
            ]}
          </LiftWords>
        </h1>
      </div>
      <FloodTint {...props} at={TINT_AT} ms={TINT_MS} />
      <div style={{ gridArea: "1 / 1", zIndex: 16, pointerEvents: "none", display: "grid", placeItems: "center" }}>
        <WordSequence
          {...props}
          words={["CONNECTED", "TRUSTED", "INTELLIGENT"]}
          at={WORD_START_MS}
          step={WORD_STEP_MS}
          rollInMs={WORD_ROLL_IN_MS}
          wipeMs={WORD_WIPE_MS}
          rollOutMs={WORD_OUT_MS}
          className="font-montserrat pl-[0.15em] text-[5cqw] leading-none font-bold tracking-[0.15em] text-white"
          textShadow="0.2083cqw 0.2083cqw 0.4167cqw rgb(0 0 0 / 0.25)"
        />
      </div>
      <IqCrest {...props} at={CREST_AT} />
      <WipeOut {...props}>
        <div className="grid place-items-center">
          <Settle {...props} at={MOVE_AT} rise={SETTLE_PX}>
            <TypeText
              {...props}
              text="introducing"
              startDelay={INTRO_START}
              pace={INTRO_PACE}
              onKey={(i) => playNow("key", i % 3 === 0 ? 1 : 0.85, 1 + (i % 4) * 0.03)}
              className="font-geist text-[3.333cqw] leading-none font-normal whitespace-nowrap text-muted-foreground"
            />
          </Settle>
          <ConnectorsWord {...props} rollAt={ROLL_AT} popAt={POP_AT} fontSize={px(CONNECTORS_PX)} />
          <ConnectorIcons {...props} size={px(CAP_HEIGHT_PX)} appearAt={iconAt} />
        </div>
      </WipeOut>
    </div>
  );
}
