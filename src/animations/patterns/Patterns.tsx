import { useEffect, useRef } from "react";
import { BREATHE_EASE, type ClipProps, ROLL, SPRING, cq, goFor, play, spring, springEase } from "../../play";
import { type ShapeKind, breatheSnap, fitBox, fitShapes, layoutBox, stretchInto } from "../../clips/StretchText";
import { BounceText, bounceLength } from "../../clips/BounceTitle";
import { RollText } from "../../clips/RollText";
import { GLITCH_MS, GLITCH_SLATE, glitch } from "../../clips/GlitchTransition";
import { SCRIBBLE_INK, Scribble, scribble, writeMs } from "../../clips/Scribble";
import { BIGGER, FIRST, LOUDER, MDS, MOSAIC, NOW, PUI, DAWN, TITLE } from "./glyphs";

// Scribbled text (clips/Scribble): each glyph outline is traced by the pen, then its ink settles in.
// pace scales the whole write-on: the opening line is written faster still so the film gets going.
const TITLE_PACE = 0.7;

// Opening: blank beat, "In the beginning..." is written, holds, fades out, then the scene fades in.
const TEXT_AT = 500;
const HOLD_MS = 1060;
const OUT_AT = TEXT_AT + writeMs(TITLE, TITLE_PACE) + HOLD_MS;
const OUT_MS = 400;
const BG_AT = OUT_AT + OUT_MS;
const BG_MS = 1500;

// The small dinosaur runs in from the right on a flick-book cycle: drawings change every STEP_MS (12fps, "on twos")
// while the body glides smoothly. RUN_STEPS is chosen so the last drawing shown is the neutral pose.
const CYCLE = ["fwd", "neutral", "back", "neutral"] as const;
const STEP_MS = 83;
const RUN_STEPS = 21; // 21 % 4 = 1, so the cycle lands on "neutral"
const RUN_MS = RUN_STEPS * STEP_MS;
const RUN_AT = BG_AT + BG_MS - 300; // sets off just as the scene settles
const DINO_W = 216; // the standing drawings; the lowered-head ones are wider and overhang to the left

// Once stopped, it potters about on the same 83ms flick-book clock. Each entry is a drawing and how many steps it holds.
// Look around, turn back, lower the head and peck, then reverse up, look again and go back to pecking. The second round of
// pecking lasts exactly as long as the medium dinosaur's run (7 + 4x4 + 1 = 24 steps = MED_RUN_STEPS), so the moment it
// pulls up the small one lifts back to neutral and looks up at it.
const FACE_OFF = 8; // steps the two hold their look at each other
const PECKS = (n: number) => Array.from({ length: n }, () => [["half", 2], ["ground", 2]] as const).flat();
type Hold = readonly [Pose, number];
// Everything up to the moment its head starts going down the second time.
const IDLE_FIRST: Hold[] = [
  ["neutral", 5], ["look", 5], ["turn", 5], ["neutral", 3],
  ["down", 3], ["half", 2], ["ground", 3], ...PECKS(3),
  ["half", 2], ["down", 2], ["neutral", 3], ["look", 5], ["neutral", 3],
];
// The second descent and pecking: the medium dinosaur runs in for exactly this long.
const IDLE_SECOND: Hold[] = [["down", 2], ["half", 2], ["ground", 3], ...PECKS(4), ["ground", 1]];
// Lifts back up to neutral, then looks up at the medium one.
const LIFT: Hold[] = [["half", 2], ["down", 2], ["neutral", 4]];
// Startled, it hops on the spot (the jump drawing, lifted on a JUMP_LIFT arc), lands, turns and runs off to the right.
const JUMP_STEPS = 4;
const JUMP_LIFT = 40; // px at the top of the hop
const LAND_STEPS = 1;
const TURN_STEPS = 2;
const OFF_STEPS = 16; // run cycle until it is well off the right edge
const ESCAPE: Hold[] = [["jump", JUMP_STEPS], ["lookup", LAND_STEPS], ["turn", TURN_STEPS]];
const IDLE: Hold[] = [...IDLE_FIRST, ...IDLE_SECOND, ...LIFT, ["lookup", FACE_OFF], ...ESCAPE];
const steps = (h: Hold[]) => h.reduce((t, [, n]) => t + n, 0);
// Native widths of each Figma frame. Drawings are pinned at the bottom right (feet and tail stay put between frames).
const POSE_W: Record<string, number> = {
  fwd: 216, neutral: 216, back: 216, look: 216, turn: 216, lookup: 216, down: 233, half: 252, ground: 253, jump: 252,
};
// The jump drawing is framed differently: its feet sit 49.5px further left and 30px above the frame's bottom (measured
// from the ink), so these line them up with the standing feet.
const POSE_RIGHT: Record<string, number> = { jump: 49.5 };
const POSE_DOWN: Record<string, number> = { jump: 30 };
const POSES = ["fwd", "neutral", "back", "look", "turn", "down", "half", "ground", "lookup", "jump"] as const;
type Pose = (typeof POSES)[number];
// The whole drawing timeline from the moment the run starts: the run cycle, the idle, then the run off (mirrored).
const TIMELINE: Pose[] = [
  ...Array.from({ length: RUN_STEPS }, (_, k) => CYCLE[k % CYCLE.length]),
  ...IDLE.flatMap(([p, n]) => Array<Pose>(n).fill(p)),
  ...Array.from({ length: OFF_STEPS }, (_, k) => CYCLE[k % CYCLE.length]),
];
const JUMP_AT = RUN_AT + (RUN_STEPS + steps(IDLE) - steps(ESCAPE)) * STEP_MS;
const OFF_AT = RUN_AT + (RUN_STEPS + steps(IDLE)) * STEP_MS;
const DINO_FEET_Y = 880; // ground line in the 1920x1080 frame
// The small one stops right of centre so that, once the medium one pulls up beside it, the pair is centred in frame.
// The pair spans from the medium one's tail to the small one's tail; PAIR_SHIFT moves that span's middle onto x=960.
const PAIR_SHIFT = 90; // left of true centre to leave room for the big dinosaur entering from the right later
const DINO_END_X = 960 - DINO_W / 2 + PAIR_SHIFT;

// "...there was Mosaic" is written straight into the sky above the volcano while the dinosaur runs.
const MOSAIC_AT = RUN_AT + 700;
const MOSAIC_Y = 170; // centre of the line in the 1920x1080 frame
// It stays up while the dinosaur stops and has its first look around, then fades as it turns back. That is about 2.4s of
// reading time after the last letter, long enough to take in a four-word line without lingering.
const MOSAIC_HOLD_MS = 2400;
// Mosaic and its follow-up line hold a little shorter so both are read and gone before "Then came MDS".
const PAIR_HOLD_MS = 1300;
const MOSAIC_OUT_AT = MOSAIC_AT + writeMs(MOSAIC) + PAIR_HOLD_MS;
// "the first design system" is written into the same spot once the Mosaic line has faded.
const FIRST_AT = MOSAIC_OUT_AT + OUT_MS;
const FIRST_OUT_AT = FIRST_AT + writeMs(FIRST) + PAIR_HOLD_MS;

// The medium dinosaur runs in from the left just as the small one goes back down for its second round of pecking, facing right, and pulls up just short
// of the small one (whose pecking head reaches out to about x=815). Same flick-book cycle; the two airborne drawings sit
// MED_BOUNCE px higher than neutral so this one bounds along.
const MED_W = { fwd: 358, neutral: 359, back: 359, lookdown: 359, lookback: 358, lookup: 363, bitten: 358, gone: 0 } as const;
// "lookback" is drawn with its feet 39px further right in the frame (measured from the ink), so it shifts left to keep them planted.
// "lookup" and "bitten" are drawn already facing left, so it is pre-mirrored to come out the right way round inside the turned-round
// wrapper, and shifted 1px so its feet land on the mirrored neutral's.
const MED_LEFT: Partial<Record<keyof typeof MED_W, number>> = { lookback: -39, lookup: -1 };
const MED_BOUNCE = 7;
const MED_RUN_STEPS = steps(IDLE_SECOND); // enters as the head goes down, stops as it starts lifting
const MED_RUN_MS = MED_RUN_STEPS * STEP_MS;
const MED_AT = RUN_AT + (RUN_STEPS + steps(IDLE_FIRST)) * STEP_MS;
// "Then came MDS" is written into the same spot as the Mosaic line as it arrives, and holds for the same time.
const MDS_AT = MED_AT;
const MDS_OUT_AT = MDS_AT + writeMs(MDS) + PAIR_HOLD_MS;
// "bigger and improved" follows it in the same spot, like the Mosaic pair.
const BIGGER_AT = MDS_OUT_AT + OUT_MS;
const BIGGER_OUT_AT = BIGGER_AT + writeMs(BIGGER) + PAIR_HOLD_MS;
const MED_END_RIGHT = 790 + PAIR_SHIFT; // its nose stops just short of the small one's pecking head
const MED_FOLLOW_DELAY = 3;
const MED_FOLLOW_STEPS = 14; // the last step (13 % 4 = 1) is "neutral", so it stops on its feet
// Where the medium one's nose stops, chosen so it and the big one (pulled up behind it) are centred as a pair: the span
// runs from the big one's tail to this nose, so 2 * nose - (MED_W + BIG_GAP + BIG_W) = 2 * 960.
const BIG_GAP = 100; // space between the big one's nose and the medium one's tail
const MED_STOP_NOSE = (2 * 960 + 359 + BIG_GAP + 609) / 2;
// It sets off after the small one a beat later, and pulls up a little right of centre.
const MED_FOLLOW_AT = OFF_AT + MED_FOLLOW_DELAY * STEP_MS;

// The big dinosaur runs on from the left once the medium one has settled, bounding like it (the airborne drawings sit
// BIG_BOUNCE px higher), and pulls up behind it. As it gets close the medium one turns its head back to look at it.
// Liam's 2026-11-16 drawings (Figma 261:36 neutral, 261:35 fwd, 261:69 back, 261:105 open, 261:162 shut, 267:3 lookup),
// mirrored to face right. They are drawn at about 450px; BIG_SCALE keeps the big one the size the old drawing was in frame.
const BIG_SCALE = 609 / 450.473;
const BIG_NATIVE = { fwd: 450.628, neutral: 450.473, back: 452, open: 496, shut: 491.214, lookup: 440.804 } as const;
const BIG_W = Object.fromEntries(Object.entries(BIG_NATIVE).map(([k, w]) => [k, w * BIG_SCALE])) as Record<keyof typeof BIG_NATIVE, number>;
// Every frame's ink reaches its bottom edge, so they share one ground line with no drop.
const BIG_DROP: Partial<Record<keyof typeof BIG_W, number>> = {};
// Shift each drawing so the centre of its feet sits over neutral's (feet measured from the ink, native px, scaled).
const BIG_FEET_X = { neutral: 226.5, fwd: 222.5, back: 210, open: 232.5, shut: 215.5, lookup: 227.5 } as const;
const BIG_LEFT = Object.fromEntries(Object.entries(BIG_FEET_X).map(([k, x]) => [k, (BIG_FEET_X.neutral - x) * BIG_SCALE])) as Partial<Record<keyof typeof BIG_W, number>>;
const BIG_BOUNCE = 10;
// "Soon after, along came Platform UI" keeps the same rhythm as "Then came MDS" after the Mosaic pair: it starts the same pause after
// "bigger and improved" has faded (plus PUI_EXTRA_MS, so it doesn't feel rushed), and the big one appears 500ms into it.
const LINE_GAP = MDS_AT - (FIRST_OUT_AT + OUT_MS);
const PUI_EXTRA_MS = 300;
const PUI_AT = BIGGER_OUT_AT + OUT_MS + LINE_GAP + PUI_EXTRA_MS;
const BIG_DELAY = Math.round((PUI_AT + 500 - MED_FOLLOW_AT) / STEP_MS) - MED_FOLLOW_STEPS; // steps after the medium one stops
const BIG_RUN_STEPS = 21; // 21 % 4 = 1, lands on "neutral"
const BIG_TURN_STEPS = 9; // the medium one looks back this many steps before the big one stops
const BIG_HOLD_STEPS = 6; // they hold the look after it stops
// Then the medium one settles back to neutral, turned round (mirrored about its feet) to face the big one.
const MED_FACE_STEPS = 4;
// Then it looks up at the big one.
const MED_LOOKUP_STEPS = 8;
// Then the big one eats it in two bites: jaws open, snap shut. After the first the medium one is left bitten (soft red
// bite mark); after the second it is gone. "gone" is an empty step: no drawing shows.
const BITE = [["open", 3], ["shut", 2], ["neutral", 5]] as const;
const BITE_STEPS = BITE.reduce((t, [, n]) => t + n, 0);
const BITE2_HOLD = 6; // the big one holds neutral after the second bite
// It stands BIG_GAP back, so it lunges forward as its jaws open for the first bite and stays there.
const BIG_LUNGE = 100;
const MED_FEET_X = 159; // centre of the neutral drawing's feet, measured from the ink
const BIG_END_RIGHT = MED_STOP_NOSE - MED_W.neutral - BIG_GAP; // its nose stops just short of the medium one's tail
const BIG_AT = MED_FOLLOW_AT + (MED_FOLLOW_STEPS + BIG_DELAY) * STEP_MS;
const PUI_OUT_AT = PUI_AT + writeMs(PUI) + PAIR_HOLD_MS;
// "A formidable new force" follows it in the same spot, like "A more refined species" after MDS.
const LOUDER_AT = PUI_OUT_AT + OUT_MS;
const LOUDER_OUT_AT = LOUDER_AT + writeMs(LOUDER) + PAIR_HOLD_MS;
const BITE_AT = BIG_AT + (BIG_RUN_STEPS + BIG_HOLD_STEPS + MED_FACE_STEPS + MED_LOOKUP_STEPS) * STEP_MS;
// The big one has finished eating (two bites, then its hold) by this point.
const BITES_DONE_AT = BITE_AT + (2 * BITE_STEPS + BITE2_HOLD) * STEP_MS;
// "But now..." after the same brief pause that separates the line pairs, but never before the big one has finished eating,
// since it looks up as the line finishes. NOW_DELAY holds it back a little more, so the big one stands in neutral longer.
const NOW_DELAY = 300;
const NOW_AT = Math.max(LOUDER_OUT_AT + OUT_MS + LINE_GAP, BITES_DONE_AT - writeMs(NOW) + 2 * STEP_MS) + NOW_DELAY;
const NOW_OUT_AT = NOW_AT + writeMs(NOW) + PAIR_HOLD_MS;
// As "But now..." finishes writing, the big one looks up and, after a beat, the camera rockets backwards: the jungle
// shrinks to a speck on Earth, seen from space. A meteor streaks in and strikes that spot, an explosion in the Act 2
// colours swallows the planet and fills the frame, and at its brightest the picture switches off like an old CRT: it
// squashes to a glowing white line through a bright dot, the line shrinks into the dot, and the dot fades to the dark.
const LOOKUP_AT = NOW_AT + writeMs(NOW);
const LOOKUP_HOLD_MS = 500;
const ZOOM_AT = LOOKUP_AT + LOOKUP_HOLD_MS;
const ZOOM_MS = 750;
// Liam's storyboard (Figma 259:312 / 310 / 353 / 522): Earth (earth.svg, 259:577) 382px across in the middle of the
// frame; the meteor comes in level from the right and strikes its right-hand side; the explosion (boom.svg, 259:603,
// 939x921) bursts out over the planet. The jungle zooms out through the middle of the frame, Earth's centre.
const EARTH_W = 382;
const EARTH_AT_XY = [960, 540] as const; // its centre in the frame
const SPOT_XY = EARTH_AT_XY; // where the zoom goes through
const IMPACT_XY = [1100, 530] as const; // on the land on the right-hand side of the planet, where the meteor lands
// The zoom is two frames in turn, over the dark: the jungle pulls away and fades out, then space fades in as it settles.
const JUNGLE_OUT_MS = 360; // the jungle shrinks and fades out over the start of the zoom...
const JUNGLE_END_SCALE = 0.3; // ...to this size, gone before it's a speck
const SPACE_IN_AT = 400; // ms into the zoom: space fades in once the jungle has gone...
const SPACE_START_SCALE = 2.2; // ...still pulling back, from this size to its resting size as the zoom lands
const EARTH_LINES_AT = 520; // ms into the zoom: Earth's outlines ink in a touch behind its fills, ...
const EARTH_LINES_MS = 230; // ...done as the zoom lands
const METEOR_AT = ZOOM_AT + ZOOM_MS + 250; // a beat on Earth, then the meteor
const METEOR_MS = 1100; // enters at the right edge and crosses to the planet
// Liam's drawing (meteor.svg, Figma 259:563) is 533x240, travelling left: the rock's centre sits at (105, 120) and the
// flames trail off to the right. Drawn at its native size, as in the storyboard.
const METEOR_W = 533;
const METEOR_SRC = [533, 240] as const;
const METEOR_ROCK = [105, 120] as const;
const METEOR_FROM = [2030, 540] as const; // rock centre, just off the right edge, level with the planet
const METEOR_TO = IMPACT_XY;
const HIT_AT = METEOR_AT + METEOR_MS;
// On impact the picture cuts straight to the paper background of the opening (Figma 264:200) and stays there.
const OFF_BG = "#0a0a0a"; // dark --background token, behind everything
// On the paper, "a new era dawns" is scribbled like the opening line (Amatic SC 96px, centred, Figma 264:201). It starts
// 2160ms after impact, the same gap as before. It holds, then the whole frame glitches and cuts to Act 2 (Figma 264:202):
// dark, with the same line set in Geist Medium 72px. The jump in style marks the change in pace.
const DAWN_AT = HIT_AT + 2160;
const DAWN_HOLD_MS = 1200;
const GLITCH_AT = DAWN_AT + writeMs(DAWN) + DAWN_HOLD_MS;
// GLITCH_MS (600) of full-frame glitch, from clips/GlitchTransition; the Act 2 frame takes over in its second half.
const NOISE_LINES = 10; // thin horizontal lines through the text area while it glitches
const NOISE_Y = [450, 630] as const; // the text band, in the 1920x1080 frame
// Pinned rather than var(): the tokens swap with the Dark/Light toggle, and Act 2 stays dark in both.
const ACT2_BG = "#0a0a0a"; // base/foreground (light) = --background (dark)
const ACT2_INK = "#fafafa"; // base/foreground (dark)
const ACT2_ACCENT = "#F15D22"; // brand orange, Figma 267:45: the one orange in the film
// In Act 2 "...a new era dawns" holds, fades, then the title card (Figma 267:19): "introducing" rolls up (RollText),
// then "IX PATTERNS" bounces in letter by letter (BounceText).
const DAWN_OUT_AT = GLITCH_AT + GLITCH_MS + 1200;
const DAWN_OUT_MS = 400;
// The film is split in two at the empty dark frame after "...a new era dawns" fades: Act 1 (dinosaurs to here) and the
// title card, which can be watched on its own (PatternsTitle). Title card times below are from its own start; the full
// film plays it at ACT1_END.
const ACT1_END = DAWN_OUT_AT + DAWN_OUT_MS;
// The title card runs on a 140bpm grid (change BPM to match the music and everything retimes, the bounce and the morph
// included). Every move starts on a beat or a subdivision of one, and each sweep is sized so its last piece lands on a
// beat too. Holds shorten as it goes (4 beats on the name, then 1.5, then half) so the motion drives forward.
const BPM = 140;
const BEAT = 60000 / BPM;
const beats = (n: number) => n * BEAT;
const INTRO_AT = beats(0.5); // "introducing" rolls in over half a beat
const INTRO_ROLL_MS = beats(0.5);
const TITLE_CARD_AT = beats(1); // "IX PATTERNS" bounces in over a beat and a half, its last letter settling on beat 2.5
const TITLE_CARD_TEXT = "IX PATTERNS";
const BOUNCE_PACE = beats(1.5) / bounceLength(TITLE_CARD_TEXT);
// After a 4-beat hold on the name, each letter stretches out to fill its building block (Figma 267:27), left to right,
// and its outlined shape takes over as it gets there. "introducing" does the same into its orange box. Transforms and
// opacity only (no blur), so the row morphs without the browser repainting a blur on every letter each frame.
// The sweep starts on beat 6.5 and the last letter lands on 7.5.
const MORPH_START = beats(6.5);
const MORPH_MS = beats(0.5); // each letter: stretching out, then handing over to its shape
const MORPH_SPREAD = beats(0.5); // from the first letter starting to the last
const MORPH_HANDOVER = 0.5; // how far into its morph the letter fills its shape's box
// Then the shapes condense into one circle (Figma 270:2), on the ring's rhythm: a half-beat hold, the row breathes in
// over half a beat, speeding up as it goes, then on beat 8.5 springs shut in half a beat into a single circle in the
// middle of the frame, the others shrinking and fading into it as they converge. The orange box stretches wider with
// it, then springs down to a narrow upright bar on the same beat. Both keep their current heights.
const BREATHE_AT = beats(8);
const BREATHE_MS = beats(0.5);
const BREATHE_SPREAD = 0.15; // each shape drifts this fraction of its distance from the row's centre further out
const BOX_STRETCH = 1.12; // the box widens by this much as it breathes in
const SNAP_MS = beats(0.5);
const BAR_RATIO = 24 / 65; // the bar's width to height, Figma 270:2 (stroke included)
// As it snaps, the camera pushes in on the circle (the whole card scales about it), keeps creeping closer through the
// ring and the dot, and pulls back out as the document swells, landing on beat 15. Without it the middle of the card
// is a 200px speck in a 1920px frame.
const ZOOM_IN_MS = beats(1); // from the snap to the ring starting
const ZOOM_IN = 1.5;
const ZOOM_DRIFT = 1.6; // where it has crept to by the time the dot rises
const ZOOM_OUT_MS = beats(1);
// Then the bar is copied round the circle (Figma 270:37): eleven more, one every 30 degrees, popping out one by one
// clockwise from the one at the top. The first lands on beat 10 and the last on 10.5. Each stretches out along its
// spoke, overshoots a touch and settles.
const RING_AT = beats(9.5); // a beat after the snap starts, half a beat after it lands
const RING_COUNT = 12; // including the bar already there
const RING_POP_MS = beats(0.5);
const RING_STEP = beats(0.5) / (RING_COUNT - 2); // the last of the eleven starts half a beat after the first
// Then, after a half-beat hold, the ring breathes out over half a beat, the circle swelling a touch with it, and on beat 11.5
// it collapses inward into an orange dot inside the circle (Figma 270:96). The dot's size is Figma's, relative to the 90px
// circle.
const RING_BREATHE_AT = beats(11);
const RING_BREATHE_MS = beats(0.5);
const RING_SPREAD = 0.14; // the ring pushes this fraction of its radius further out
const CIRCLE_SWELL = 1.08;
const COLLAPSE_AT = beats(11.5);
const COLLAPSE_MS = beats(0.5);
const DOT_D = 24 / 90; // the dot's diameter, as a fraction of the circle's
// After a 1.5-beat hold (the camera still creeping in) the story opens on the product itself: on beat 13.5 the dot rises
// to the middle of the blocks (Figma 298:46) as the circle shrinks away; on 14 it swells into them, the two blocks still
// apart. Then the row builds out from it: Specs on the left, Collaboration on the right, Patterns staying in the centre.
// The row is Figma's (296:126), in 1920px frame units, each piece where it ends up, so nothing slides: Specs 480, plus
// 720, Patterns 960, plus 1200, Collaboration 1440, every icon centred on PLUS_CY.
const RISE_AT = beats(13.5);
const RISE_MS = beats(0.5);
const EXPAND_AT = beats(14);
const EXPAND_MS = beats(0.5);
const ROW_STEP = 240; // frame units between neighbours in the row
const ICON_W = 240; // the document's viewBox, which the group shares
const ICON_H = 312;
const ICON_DOC_CY = 120; // the document's centre in its group
const RING_CY = 296; // where Figma has the ring under the icon: the labels' centre line, in the group
const WORD_MS = beats(0.5); // each label's roll, as long as "introducing"'s
// The blocks: their 240px group's centre, the drawing's width in it, and where the drawing's middle sits while the two
// blocks are still apart, which is where the dot rises to and swells from. On 15.5 the top block slides down onto the
// bottom one, fast at first then slowing as if it's being pushed home against a little resistance, seating on 16 as
// "Patterns" rolls down in under them.
const BLOCKS_CX = 960;
const BLOCKS_INK_W = 160;
const BLOCKS_APART_CY = 104;
const BLOCK_SLIDE_AT = beats(15.5);
const BLOCK_SLIDE_MS = beats(0.5);
const BLOCK_DROP = 32; // frame units: the top block's gap above its resting place
const BLOCKS_WORD_AT = beats(16);
const BLOCKS_WORD_TEXT = "Patterns";
// Then (Figma 290:45) the first plus pops in on the left, on 17.5: it swells out of nothing past its size and settles,
// throwing off a ring and droplets like the letters in "Inflate + pop". On beat 18 a fast burst of rays fires round it.
// The plus is Figma's icon-add-duotone, 160px. Rays, ring and droplets all stay inside the 160px gaps either side.
const PLUS_AT = beats(17.5);
const PLUS_MS = beats(0.5);
const PLUS_PEAK = 0.45; // where in the pop it hits full size, and throws the ring and droplets
const PLUS_CY = 504; // frame units: the icons' centre line, which the pluses share
const PLUS_RING_MS = beats(0.25); // the ring it throws off: quick, so it never sits there as a grey circle
const BURST_AT = beats(18);
const BURST_MS = beats(0.5);
const BURST_STEP = beats(1 / 32);
const BURST_RAYS = 8;
const RAY_IN = 84; // frame units from the plus's centre: the rays run from here...
const RAY_OUT = 106; // ...to here
const PLUS_DROPS = [-70, -20, 25, 80, 140, 205, 250]; // droplet angles, degrees from the right
// With the burst, on 18, the document (Specs, Figma 290:31) pops in left of the plus; on 18.5 its fill pops in and its
// two lines of text draw on left to right (Figma 293:74 to 293:104), the top one then the bottom, which lands with
// "Specs" rolling up in under it on 19.
const DOC_CX = BLOCKS_CX - 2 * ROW_STEP;
const DOC_AT = beats(18);
const DOC_POP_MS = beats(0.5);
const POP_AT = beats(18.5);
const POP_MS = beats(0.5);
const LINE_TOP_AT = beats(18.5);
const LINE_BOTTOM_AT = beats(19);
const LINE_MS = beats(0.5);
const WORD_AT = beats(19);
const WORD_TEXT = "Specs";
// Then collaboration (Figma 296:126) on the right: on 20.5 the second plus comes in a different way from the first: its
// two bars draw out from the middle, across then down, as it turns a quarter turn into place, and a single ring ripples
// off it. The people arrive one per quarter beat from 21: the one in front pops up first, then the two behind slide out
// from behind it, left then right, the last settling on 22, as "Collaboration" rolls up in under them.
const PLUS_TO_BURST = BURST_AT - PLUS_AT;
const PLUS2_AT = beats(20.5);
const PLUS2_BAR_MS = beats(0.25); // each bar drawing out
const PEOPLE_AT = beats(21);
const PERSON_STEP = beats(0.25); // one per quarter beat: 21, 21.25, 21.5
const PERSON_MS = beats(0.5);
const PERSON_ORDER = [1, 2, 0]; // when each figure (back left, back right, front, as drawn) arrives: the front one first
const PERSON_TUCK = 50; // frame units: how far in, behind the front one, the back two start
const PEOPLE_CX = BLOCKS_CX + 2 * ROW_STEP;
const COLLAB_WORD_AT = beats(22);
const COLLAB_WORD_TEXT = "Collaboration";
// The title card ends holding on the row for two beats, for now: the story picks up from here.
const TITLE_END = beats(24);
// Figma 267:44: one outlined shape per letter (spaces skipped), stroke 4px; these are the circles. Each shape is sized
// to its letter's ink at runtime (fitShapes), so it swells out of exactly where the letter was.
const SHAPE_GAP = 0.5; // the gaps within each word, as a fraction of the even letter spacing
const SHAPES: ShapeKind[] = [{ half: true },{}, { round: true }, {}, {}, {}, {}, { round: true }, {}, { round: true }];
const MORPH_STAGGER = MORPH_SPREAD / (SHAPES.length - 1);
const MORPH_END = MORPH_START + MORPH_SPREAD + MORPH_MS;
const BREATHE_START = Math.max(BREATHE_AT, MORPH_END); // never before the shapes have arrived
const SNAP_START = BREATHE_START + BREATHE_MS;

// Breathe and snap, built from the fitted px layout. These are rebuilt whenever it refits, so they are started on the
// same timeline origin as everything else (`t0`) rather than from when they were built.
function condense(root: HTMLElement, word: HTMLElement, intro: HTMLElement, blocks: HTMLElement[], box: HTMLElement, ring: HTMLElement, dot: HTMLElement, icon: HTMLElement, iconFill: SVGPathElement, word2: HTMLElement, plus: SVGSVGElement,
  blocksIcon: SVGSVGElement, word3: HTMLElement,
  plus2: SVGSVGElement, people: SVGSVGElement, word4: HTMLElement, at: number, t0: CSSNumberish | null, speed: number, reduced: boolean): Animation[] {
  const anims: Animation[] = [];
  const go = goFor(speed, reduced, anims, t0, at);
  const px = (n: number) => `${n}px`;
  const ease = springEase;

  // Exact layout boxes, not offsetLeft and friends: those round to whole pixels, and the dot is centred on the circle
  // from these, so rounding put it up to a pixel or so off (twice that under the camera's push in).
  const W = parseFloat(getComputedStyle(root).width);
  const wordBox = layoutBox(word), introBox = layoutBox(intro), boxBox = layoutBox(box);

  // Shapes: breathe out, then spring shut into the circle in the middle of the frame (StretchText's breatheSnap).
  const h = Math.max(...blocks.map((b) => layoutBox(b).h));
  const centre = Math.round((blocks.length - 1) / 2); // the one left showing; the rest land on it and fade
  breatheSnap(go, blocks, SHAPES, W / 2 - wordBox.l,
    { breatheAt: BREATHE_START, breatheMs: BREATHE_MS, snapMs: SNAP_MS, spread: BREATHE_SPREAD });

  // The box: stretches about its centre, then springs to the bar in the middle of the frame.
  const bl = boxBox.l, bw = boxBox.w;
  const bc = bl + bw / 2;
  const bMid = W / 2 - introBox.l;
  const wide = bw * BOX_STRETCH;
  const bar = boxBox.h * BAR_RATIO;
  go(box, [{ left: px(bl), width: px(bw) }, { left: px(bc - wide / 2), width: px(wide) }], BREATHE_START, BREATHE_MS, BREATHE_EASE);
  const bxs = spring(bc, bMid, 0.06);
  const bws = spring(wide, bar, 0.12, 0.7);
  go(box, SPRING.map((o, k) => ({ offset: o, left: px(bxs[k] - bws[k] / 2), width: px(bws[k]), ...ease(k) })), SNAP_START, SNAP_MS);

  // The ring: centred on the circle, at the distance the bar already sits from it, so the top one is the bar itself.
  const cx = W / 2;
  const cy = wordBox.t + layoutBox(blocks[centre]).t + h / 2;
  const barCy = introBox.t + boxBox.t + boxBox.h / 2;
  const r = cy - barCy;
  const spoke = (deg: number, s: string) => `rotate(${deg}deg) translateY(${-r}px) scale(${s})`;
  ([...ring.children] as HTMLElement[]).forEach((el, n) => {
    const deg = (n + 1) * (360 / RING_COUNT);
    // Centred on the circle's centre (so it rotates about it), turned onto its spoke, then pushed out to the ring.
    Object.assign(el.style, { left: px(cx - bar / 2), top: px(cy - boxBox.h / 2), width: px(bar), height: px(boxBox.h) });
    go(el, [
      { opacity: 0, transform: spoke(deg, "0.4, 0"), offset: 0 },
      { opacity: 1, transform: spoke(deg, "1, 1.12"), offset: 0.55, easing: "cubic-bezier(0.2, 0.7, 0.4, 1)" },
      { opacity: 1, transform: spoke(deg, "1, 1"), offset: 1 },
    ], RING_AT + n * RING_STEP, RING_POP_MS, "cubic-bezier(0.3, 0, 0.6, 1)");
    // Breathes out, then collapses into the centre, shrinking to nothing as the dot forms.
    go(el, [{ transform: spoke(deg, "1, 1") }, { transform: `rotate(${deg}deg) translateY(${-r * (1 + RING_SPREAD)}px)` }],
      RING_BREATHE_AT, RING_BREATHE_MS, BREATHE_EASE);
    go(el, [
      { transform: `rotate(${deg}deg) translateY(${-r * (1 + RING_SPREAD)}px) scale(1, 1)`, opacity: 1 },
      { transform: `rotate(${deg}deg) translateY(0px) scale(0.2, 0.2)`, opacity: 0 },
    ], COLLAPSE_AT, COLLAPSE_MS * 0.6, "cubic-bezier(0.6, 0, 0.9, 0.4)");
  });
  // The top bar (the box) does the same along its spoke, straight down.
  go(box, [{ translate: "0 0" }, { translate: `0 ${-r * RING_SPREAD}px` }], RING_BREATHE_AT, RING_BREATHE_MS, BREATHE_EASE);
  go(box, [{ translate: `0 ${-r * RING_SPREAD}px`, scale: "1", opacity: 1 }, { translate: `0 ${r}px`, scale: "0.2", opacity: 0 }],
    COLLAPSE_AT, COLLAPSE_MS * 0.6, "cubic-bezier(0.6, 0, 0.9, 0.4)");
  // The circle swells with the ring, then springs back as it collapses.
  const circle = blocks[centre];
  go(circle, [{ scale: "1" }, { scale: `${CIRCLE_SWELL}` }], RING_BREATHE_AT, RING_BREATHE_MS, BREATHE_EASE);
  go(circle, [{ scale: `${CIRCLE_SWELL}` }, { scale: "0.96", offset: 0.5 }, { scale: "1" }], COLLAPSE_AT, COLLAPSE_MS, "cubic-bezier(0.2, 0.7, 0.4, 1)");

  // The dot forms where the ring lands.
  const d1 = h * DOT_D;
  Object.assign(dot.style, { left: px(cx - d1 / 2), top: px(cy - d1 / 2), width: px(d1), height: px(d1) });
  go(dot, [{ scale: "0", opacity: 0 }, { scale: "1.2", opacity: 1, offset: 0.6 }, { scale: "1", opacity: 1 }],
    COLLAPSE_AT + COLLAPSE_MS * 0.4, COLLAPSE_MS * 0.6, "cubic-bezier(0.2, 0.7, 0.4, 1)");

  // The camera: pushes in on the circle as the row snaps, creeps closer through the ring and the dot, then pulls back out
  // as the document swells, back to its normal size as the fill settles.
  if (!reduced) {
    root.style.transformOrigin = `${cx}px ${cy}px`;
    const zoomEnd = EXPAND_AT + ZOOM_OUT_MS;
    const span = zoomEnd - SNAP_START;
    go(root, [
      { scale: "1", offset: 0, easing: "cubic-bezier(0.65, 0, 0.35, 1)" },
      { scale: `${ZOOM_IN}`, offset: ZOOM_IN_MS / span, easing: "linear" },
      { scale: `${ZOOM_DRIFT}`, offset: (EXPAND_AT - SNAP_START) / span, easing: "cubic-bezier(0.65, 0, 0.35, 1)" },
      { scale: "1", offset: 1 },
    ], SNAP_START, span);
  }

  // The story opens on the blocks, in the middle of the frame.
  const s = W / 1920;
  const groupTop = parseFloat(getComputedStyle(root).height) / 2 - (ICON_H * s) / 2; // the 240x312 group is centred on the frame
  const blocksCy = (PLUS_CY - ICON_W / 2 + BLOCKS_APART_CY) * s; // the middle of the two blocks, still apart
  const blocksW = BLOCKS_INK_W * s;
  blocksIcon.style.transformOrigin = `50% ${(BLOCKS_APART_CY / ICON_W) * 100}%`;
  // The dot rises to the blocks' middle.
  go(dot, [{ translate: "0 0" }, { translate: `0 ${blocksCy - cy}px` }], RISE_AT, RISE_MS, "cubic-bezier(0.65, 0, 0.35, 1)");
  // There it swells into the blocks: the dot grows and gives way as they grow out of it, a touch past their size, and
  // settle, still apart.
  go(dot, [{ scale: "1", opacity: 1 }, { scale: `${(blocksW / d1) * 0.5}`, opacity: 0 }], EXPAND_AT, EXPAND_MS * 0.45, "cubic-bezier(0.5, 0, 0.75, 0.3)");
  go(blocksIcon, [
    { scale: `${d1 / blocksW}`, opacity: 0, offset: 0, easing: "cubic-bezier(0.5, 0, 0.75, 0.3)" },
    { scale: `${(d1 / blocksW) * 2.5}`, opacity: 1, offset: 0.25, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    { scale: "1.06", opacity: 1, offset: 0.75, easing: "cubic-bezier(0.3, 0, 0.5, 1)" },
    { scale: "1", opacity: 1, offset: 1 },
  ], EXPAND_AT, EXPAND_MS, "linear");

  // Specs, the document, pops in on the left with the first plus's burst.
  Object.assign(icon.style, { left: px((DOC_CX - ICON_W / 2) * s), top: px(groupTop), width: px(ICON_W * s), height: px(ICON_H * s) });
  icon.style.transformOrigin = `50% ${(ICON_DOC_CY / ICON_H) * 100}%`;
  go(icon, [
    { scale: "0.6", opacity: 0, filter: "blur(8px)", offset: 0, easing: "cubic-bezier(0.2, 0.7, 0.4, 1)" },
    { scale: "1.06", opacity: 1, filter: "blur(0px)", offset: 0.55, easing: "cubic-bezier(0.4, 0, 0.6, 1)" },
    { scale: "1", opacity: 1, filter: "blur(0px)", offset: 1 },
  ], DOC_AT, DOC_POP_MS, "linear");
  // Then its fill pops in from the middle.
  go(iconFill, [
    { opacity: 0, transform: "scale(0.3)" },
    { opacity: 1, transform: "scale(1.1)", offset: 0.55 },
    { opacity: 1, transform: "scale(1)" },
  ], POP_AT, POP_MS, "cubic-bezier(0.2, 0.7, 0.4, 1)");
  // The circle has done its job once the dot leaves it: it shrinks away about its centre as the dot rises.
  go(circle, [{ scale: "1", opacity: 1 }, { scale: "0", opacity: 0 }], RISE_AT, RISE_MS, "cubic-bezier(0.5, 0, 0.75, 0)");

  // Each label rolls in under its icon like "introducing": a quarter turn of a drum over half a beat, the word coming up
  // from below (up) or down from above (down). The labels sit where Figma has the ring under the icon.
  const ringCy = groupTop + RING_CY * s;
  const depth = 0.55 * 48 * s; // the drum's radius: 0.55em of the 48px label, as RollText
  const persp = `perspective(${1440 * s}px)`; // RollText's 75cqw
  const rollLabel = (label: HTMLElement, at: number, dir: "up" | "down") => {
    const turn = dir === "up" ? -90 : 90;
    Object.assign(label.style, { transformOrigin: `50% 50% ${-depth}px`, backfaceVisibility: "hidden" });
    const centred = "translate(-50%, -50%)";
    go(label, [
      { transform: `${centred} ${persp} rotateX(${turn}deg)`, opacity: 1 },
      { transform: `${centred} ${persp} rotateX(0deg)`, opacity: 1 },
    ], at, WORD_MS, ROLL);
  };
  Object.assign(word2.style, { left: px(DOC_CX * s), top: px(ringCy) });
  rollLabel(word2, WORD_AT, "up");
  // A plus pops in, throwing off a ring and droplets at its peak, then a burst of rays fires round it.
  const popPlus = (plus: SVGSVGElement, PLUS_AT: number) => {
  const BURST_AT = PLUS_AT + PLUS_TO_BURST;
  const peak = PLUS_AT + PLUS_MS * PLUS_PEAK;
  // All in the drawing's own units, about its centre (0, 0).
  const sr = (k: number, deg = 0) => `rotate(${deg}deg) scale(${k})`;
  go(plus.querySelector("[data-plus]")!, [
    { transform: sr(0, -45), opacity: 0, offset: 0, easing: "cubic-bezier(0.3, 0, 0.6, 1)" },
    { transform: sr(1.22, 6), opacity: 1, offset: PLUS_PEAK, easing: "cubic-bezier(0.2, 0.7, 0.4, 1)" },
    { transform: sr(0.95, -2), opacity: 1, offset: 0.75, easing: "cubic-bezier(0.4, 0, 0.6, 1)" },
    { transform: sr(1), opacity: 1, offset: 1 },
  ], PLUS_AT, PLUS_MS, "linear");
  go(plus.querySelector("[data-pop-ring]")!, [{ transform: sr(0.5), opacity: 0.9 }, { transform: sr(1.7), opacity: 0 }],
    peak, PLUS_RING_MS, "cubic-bezier(.2,.7,.4,1)");
  plus.querySelectorAll("[data-drop]").forEach((d, k) => {
    const a = (PLUS_DROPS[k] * Math.PI) / 180, r = 92 + (k % 3) * 8;
    go(d, [
      { transform: "translate(0px, 0px) scale(1)", opacity: 1 },
      { transform: `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r}px) scale(0.3)`, opacity: 0 },
    ], peak, beats(0.5), "cubic-bezier(.2,.7,.4,1)");
  });
  plus.querySelectorAll("[data-ray]").forEach((ray, i) =>
    go(ray, [
      { strokeDashoffset: 1, opacity: 1, offset: 0 },
      { strokeDashoffset: 0, opacity: 1, offset: 0.5 },
      { strokeDashoffset: -1, opacity: 0, offset: 1 },
    ], BURST_AT + i * BURST_STEP, BURST_MS, "cubic-bezier(0.23, 1, 0.32, 1)"));
  };
  popPlus(plus, PLUS_AT);

  // Then on the right the second plus comes in its own way: it turns a quarter turn into place as its bars draw out from
  // the middle, across then down, and a single ring ripples off it as the second lands.
  const sr2 = (k: number, deg = 0) => `rotate(${deg}deg) scale(${k})`;
  go(plus2.querySelector("[data-plus]")!, [
    { transform: sr2(0.85, -90), opacity: 1, offset: 0, easing: "cubic-bezier(0.34, 1.4, 0.64, 1)" },
    { transform: sr2(1), opacity: 1, offset: 1 },
  ], PLUS2_AT, 2 * PLUS2_BAR_MS);
  plus2.querySelectorAll("[data-bar]").forEach((bar, k) =>
    go(bar, [{ strokeDasharray: "0 1", strokeDashoffset: -0.5 }, { strokeDasharray: "1 1", strokeDashoffset: 0 }],
      PLUS2_AT + k * PLUS2_BAR_MS, PLUS2_BAR_MS, "cubic-bezier(0.22, 1, 0.36, 1)"));
  go(plus2.querySelector("[data-pop-ring]")!, [{ transform: sr2(0.6), opacity: 0.6 }, { transform: sr2(1.6), opacity: 0 }],
    PLUS2_AT + 2 * PLUS2_BAR_MS, PLUS_RING_MS, "cubic-bezier(.2,.7,.4,1)");

  // The people: the one in front pops up first, then the two behind it slide out from behind, left then right.
  people.querySelectorAll("[data-person]").forEach((el, i) => {
    const slot = PERSON_ORDER[i];
    const t = PEOPLE_AT + slot * PERSON_STEP;
    if (slot === 0) {
      go(el, [
        { scale: "0.4", opacity: 0, translate: `0 ${12}px`, offset: 0, easing: "cubic-bezier(0.2, 0.7, 0.4, 1)" },
        { scale: "1.1", opacity: 1, translate: "0 0", offset: 0.5, easing: "cubic-bezier(0.4, 0, 0.6, 1)" },
        { scale: "0.97", opacity: 1, translate: "0 0", offset: 0.78, easing: "ease-in-out" },
        { scale: "1", opacity: 1, translate: "0 0", offset: 1 },
      ], t, PERSON_MS);
      return;
    }
    const tuck = i === 0 ? PERSON_TUCK : -PERSON_TUCK; // towards the middle, behind the front one
    go(el, [
      { translate: `${tuck}px 0`, opacity: 0, offset: 0, easing: "ease-out" },
      { opacity: 1, offset: 0.2, easing: "cubic-bezier(0.34, 1.3, 0.64, 1)" },
      { translate: "0 0", opacity: 1, offset: 1 },
    ], t, PERSON_MS);
  });
  go(people.querySelector("[data-people-fill]")!, [{ opacity: 0 }, { opacity: 1 }], PEOPLE_AT + 2 * PERSON_STEP + PERSON_MS * 0.5, beats(0.25), "ease-out");

  Object.assign(word4.style, { left: px(PEOPLE_CX * s), top: px(ringCy) });
  rollLabel(word4, COLLAB_WORD_AT, "up");

  // The blocks' label, under them in the middle.
  Object.assign(word3.style, { left: px(BLOCKS_CX * s), top: px(ringCy) });
  rollLabel(word3, BLOCKS_WORD_AT, "down");
  // The top block slides down onto the bottom one: most of the way quickly, then the last bit slowly, pushing it home.
  // The bottom block's studs are clipped away under it as it comes, so they go into it rather than showing through.
  blocksIcon.querySelectorAll("[data-block-slide]").forEach((el) =>
    go(el, [
      { transform: "translate(0px, 0px)", offset: 0, easing: "cubic-bezier(0.25, 0.8, 0.5, 1)" },
      { transform: `translate(0px, ${BLOCK_DROP * 0.75}px)`, offset: 0.3, easing: "cubic-bezier(0.35, 0.3, 0.45, 1)" },
      { transform: `translate(0px, ${BLOCK_DROP}px)`, offset: 1 },
    ], BLOCK_SLIDE_AT, BLOCK_SLIDE_MS, "linear"));
  // As the studs finish going in, the bottom block becomes its plain body, so the top block's base cuts across its top edge.
  go(blocksIcon.querySelector("[data-block-seat]")!, [{ opacity: 0 }, { opacity: 1 }],
    BLOCK_SLIDE_AT + BLOCK_SLIDE_MS * 0.3, BLOCK_SLIDE_MS * 0.3, "ease-out");

  // The document's two lines draw on, top then bottom.
  icon.querySelectorAll("[data-line]").forEach((line, i) =>
    go(line, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], i ? LINE_BOTTOM_AT : LINE_TOP_AT, LINE_MS, "cubic-bezier(0.65, 0, 0.35, 1)"));
  return anims;
}
const BOX_ORANGE = ACT2_ACCENT;
// Scales and moves SVG pieces about the drawing's origin (0, 0) rather than their own boxes.
const SVG_ORIGIN: React.CSSProperties = { transformBox: "view-box", transformOrigin: "0 0" };

// The document icon, Figma 290:31 (icon-document-duotone), without its ring.
// Drawn in the group's 240x312 frame so it sits exactly where Figma has it. The fill starts hidden and pops in on its own;
// the two lines start undrawn.
function DocumentIcon({ fillRef }: { fillRef?: React.Ref<SVGPathElement> }) {
  return (
    <svg viewBox={`0 0 ${ICON_W} ${ICON_H}`} className="block size-full" fill="none" aria-hidden>
      <defs>
        <linearGradient id="patterns-doc-stroke" x1="40" y1="20" x2="235.12" y2="176.1" gradientUnits="userSpaceOnUse">
          <stop offset="0.35" stopColor="#EAB308" />
          <stop offset="0.6" stopColor="#F15D22" />
        </linearGradient>
      </defs>
      <path
        d="M180 20C191.046 20 200 28.9543 200 40V200C200 211.046 191.046 220 180 220H60C48.9543 220 40 211.046 40 200V80H80C91.0457 80 100 71.0457 100 60V20H180Z"
        ref={fillRef} fill="#F15D22" fillOpacity={0.15} opacity={0} style={{ transformBox: "fill-box", transformOrigin: "center" }} />
      <path
        d="M182.041 20.1074C192.128 21.13 200 29.6435 200 40V200L199.893 202.041C198.87 212.128 190.357 220 180 220H60C49.6435 220 41.13 212.128 40.1074 202.041L40 200V78.2812C40.0007 73.6397 41.6142 69.1641 44.5312 65.6055L45.8594 64.1406L84.1406 25.8594C87.8906 22.1094 92.978 20.0008 98.2812 20H180L182.041 20.1074ZM107.5 60C107.5 75.1878 95.1878 87.5 80 87.5H55V200C55 202.761 57.2386 205 60 205H180C182.761 205 185 202.761 185 200V40C185 37.2386 182.761 35 180 35H107.5V60ZM58.7109 72.5H80C86.9036 72.5 92.5 66.9036 92.5 60V38.7109L58.7109 72.5Z"
        fillRule="evenodd" clipRule="evenodd" fill="url(#patterns-doc-stroke)" />
      {/* Its two lines of text (Figma 293:104), as round-capped strokes so they can draw on: each is the same 95x15 pill. */}
      {[112.5, 152.5].map((y) => (
        <path key={y} data-line d={`M79.5 ${y}H159.5`} stroke="url(#patterns-doc-stroke)" strokeWidth={15} strokeLinecap="round"
          pathLength={1} strokeDasharray="1 1" strokeDashoffset={1} />
      ))}
    </svg>
  );
}
// A plus and its pop (a ring, droplets and a burst of rays), drawn in frame units about its centre, `cx` across the frame.
// `drawn` makes the plus two round-capped strokes (the same 80x10 bars) so they can draw out from the middle.
function PlusPop({ ref, cx, drawn }: { ref?: React.Ref<SVGSVGElement>; cx: number; drawn?: boolean }) {
  return (
    <svg ref={ref} viewBox="-240 -240 480 480" className="pointer-events-none absolute overflow-visible" aria-hidden
      style={{ left: cq(cx - 240), top: cq(PLUS_CY - 240), width: cq(480), height: cq(480) }}>
      {Array.from({ length: BURST_RAYS }, (_, i) => (
        <line key={i} data-ray x1={0} y1={-RAY_IN} x2={0} y2={-RAY_OUT} transform={`rotate(${(i * 360) / BURST_RAYS})`}
          stroke={BOX_ORANGE} strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1}
          opacity={0} />
      ))}
      <circle data-pop-ring r={60} fill="none" stroke={ACT2_INK} strokeWidth={4} opacity={0} style={SVG_ORIGIN} />
      {PLUS_DROPS.map((a) => (
        <circle key={a} data-drop r={4} fill={ACT2_INK} opacity={0} style={SVG_ORIGIN} />
      ))}
      <g data-plus opacity={0} style={SVG_ORIGIN}>
        {drawn ? (
          [["-35 0", "35 0"], ["0 -35", "0 35"]].map(([a, b]) => (
            <path key={a} data-bar d={`M${a}L${b}`} stroke={ACT2_INK} strokeWidth={10} strokeLinecap="round"
              pathLength={1} strokeDasharray="0 1" strokeDashoffset={-0.5} />
          ))
        ) : (
          <path transform="translate(-40 -40)" d="M40 0C42.7614 0 45 2.23858 45 5V35H75C77.7614 35 80 37.2386 80 40C80 42.7614 77.7614 45 75 45H45V75C45 77.7614 42.7614 80 40 80C37.2386 80 35 77.7614 35 75V45H5C2.23858 45 0 42.7614 0 40C0 37.2386 2.23858 35 5 35H35V5C35 2.23858 37.2386 0 40 0Z"
            fill={ACT2_INK} />
        )}
      </g>
    </svg>
  );
}

// The people, Figma 296:142 (icon-user-group), split into its three figures so they can arrive one at a time. Figma's
// outline is one merged shape; here each figure is a 15px ring and body traced along its middle, and the one in front
// sits on a patch of the background the shape of its outline, which hides the two behind where Figma's union cuts them.
const PERSON_ORIGIN: React.CSSProperties = { transformBox: "fill-box", transformOrigin: "50% 100%" };
function BackPerson({ cx }: { cx: number }) {
  // Mirrored about the icon's centre for the right one.
  const flip = cx > 120;
  return (
    <g data-person opacity={0} style={PERSON_ORIGIN}>
      <g transform={flip ? "translate(240 0) scale(-1 1)" : undefined}>
        <circle cx={70} cy={60} r={32.5} stroke="url(#patterns-people-stroke)" strokeWidth={15} />
        <path d="M120 157.5H27.5V125A32.5 32.5 0 0 1 60 92.5H120" stroke="url(#patterns-people-stroke)" strokeWidth={15} />
      </g>
    </g>
  );
}
function PeopleIcon({ ref, style }: { ref?: React.Ref<SVGSVGElement>; style?: React.CSSProperties }) {
  return (
    <svg ref={ref} viewBox="0 0 240 240" className="pointer-events-none absolute overflow-visible" fill="none" aria-hidden style={style}>
      <defs>
        <linearGradient id="patterns-people-stroke" x1="20" y1="20" x2="220" y2="220" gradientUnits="userSpaceOnUse">
          <stop offset="0.35" stopColor="#EAB308" />
          <stop offset="0.6" stopColor="#F15D22" />
        </linearGradient>
      </defs>
      <BackPerson cx={70} />
      <BackPerson cx={170} />
      <g data-person opacity={0} style={PERSON_ORIGIN}>
        {/* The patch that hides the two behind. */}
        <circle cx={120} cy={105} r={50} fill={ACT2_BG} />
        <path d="M60 180C60 157.909 77.9086 140 100 140H140C162.091 140 180 157.909 180 180V220H60V180Z" fill={ACT2_BG} />
        <path data-people-fill opacity={0} d="M60 180C60 157.909 77.9086 140 100 140H140C162.091 140 180 157.909 180 180V220H60V180Z" fill="#F15D22" fillOpacity={0.15} />
        <circle cx={120} cy={105} r={42.5} stroke="url(#patterns-people-stroke)" strokeWidth={15} />
        <path d="M67.5 212.5V180A32.5 32.5 0 0 1 100 147.5H140A32.5 32.5 0 0 1 172.5 180V212.5Z" stroke="url(#patterns-people-stroke)" strokeWidth={15} />
      </g>
    </svg>
  );
}

// The blocks, Figma 298:46: two stacked bricks drawn apart, in the group's 240x240 frame (the drawing sits at 40, -12).
// Each is an inside stroke (a 30px stroke masked to its own shape) over a 15% fill, as Figma draws them. The top one, and
// the clip that hides the bottom one's studs under it, slide down together (data-block-slide).
const BRICK = "M65 0C69.4183 0 73 3.58172 73 8V24H89V8C89 3.58172 92.5817 0 97 0L129 0C133.418 0 137 3.58172 137 8V24H149C155.627 24 161 29.3726 161 36V100C161 106.627 155.627 112 149 112H13C6.37258 112 1 106.627 1 100V36C1 29.3726 6.37258 24 13 24H25V8C25 3.58172 28.5817 0 33 0L65 0Z";
function Brick({ id, y }: { id: string; y: number }) {
  return (
    <g transform={`translate(0 ${y})`}>
      <defs>
        <path id={`${id}-shape`} d={BRICK} />
        <mask id={`${id}-mask`} fill="white"><use href={`#${id}-shape`} /></mask>
        <linearGradient id={`${id}-stroke`} x1="1" y1="0" x2="106.234" y2="150.337" gradientUnits="userSpaceOnUse">
          <stop offset="0.35" stopColor="#EAB308" />
          <stop offset="0.6" stopColor="#F15D22" />
        </linearGradient>
      </defs>
      <use href={`#${id}-shape`} fill="#F15D22" fillOpacity={0.15} />
      <use href={`#${id}-shape`} stroke={`url(#${id}-stroke)`} strokeWidth={30} mask={`url(#${id}-mask)`} />
    </g>
  );
}
function BlocksIcon({ ref, style }: { ref?: React.Ref<SVGSVGElement>; style?: React.CSSProperties }) {
  return (
    <svg ref={ref} viewBox="0 0 240 240" className="pointer-events-none absolute overflow-visible opacity-0" fill="none" aria-hidden style={style}>
      <defs>
        {/* Everything below the top block's bottom edge. */}
        <clipPath id="patterns-blk-clip"><rect data-block-slide x={-20} y={112} width={200} height={200} /></clipPath>
      </defs>
      <g transform="translate(40 -12)">
        <g clipPath="url(#patterns-blk-clip)"><Brick id="patterns-blk-bottom" y={120} /></g>
        {/* Once the studs have gone in, the bottom one is just its body (Figma 298:28), with a full top edge for the top one to sit on. */}
        <g data-block-seat opacity={0}>
          <defs>
            {/* Its top edge tucks up under the top block's base (one stroke's width), so the join reads as one shared line. */}
            <rect id="patterns-blk-body" x={1} y={129} width={160} height={103} rx={12} />
            <mask id="patterns-blk-body-mask" fill="white"><use href="#patterns-blk-body" /></mask>
            <linearGradient id="patterns-blk-body-stroke" x1="1" y1="129" x2="75.3" y2="264.1" gradientUnits="userSpaceOnUse">
              <stop offset="0.35" stopColor="#EAB308" />
              <stop offset="0.6" stopColor="#F15D22" />
            </linearGradient>
          </defs>
          <use href="#patterns-blk-body" fill="#0a0a0a" />
          <use href="#patterns-blk-body" fill="#F15D22" fillOpacity={0.15} />
          <use href="#patterns-blk-body" stroke="url(#patterns-blk-body-stroke)" strokeWidth={30} mask="url(#patterns-blk-body-mask)" />
        </g>
        <g data-block-slide><Brick id="patterns-blk-top" y={0} /></g>
      </g>
    </svg>
  );
}

const BIG_TO_LOOKUP = Math.round((LOOKUP_AT - BIG_AT) / STEP_MS);
const BIG_TIMELINE: (keyof typeof BIG_W)[] = [
  ...Array.from({ length: BIG_RUN_STEPS }, (_, k) => CYCLE[k % CYCLE.length]),
  ...Array(BIG_HOLD_STEPS + MED_FACE_STEPS + MED_LOOKUP_STEPS).fill("neutral"),
  ...BITE.flatMap(([p, n]) => Array(n).fill(p)),
  ...BITE.flatMap(([p, n]) => Array(n).fill(p)),
  ...Array(BITE2_HOLD).fill("neutral"),
];
BIG_TIMELINE.push(...Array(BIG_TO_LOOKUP - BIG_TIMELINE.length).fill("neutral"), ...Array(12).fill("lookup"));
// Lands on neutral and waits while the small one lifts its head (half, down, neutral: 8 steps), then they look at each other together.
const MED_TIMELINE: (keyof typeof MED_W)[] = [
  ...Array.from({ length: MED_RUN_STEPS }, (_, k) => CYCLE[k % CYCLE.length]),
  ...Array(steps(LIFT)).fill("neutral"),
  ...Array(FACE_OFF + steps(ESCAPE) + MED_FOLLOW_DELAY).fill("lookdown"),
  ...Array.from({ length: MED_FOLLOW_STEPS }, (_, k) => CYCLE[k % CYCLE.length]),
  ...Array(BIG_DELAY + BIG_RUN_STEPS - BIG_TURN_STEPS).fill("neutral"),
  ...Array(BIG_TURN_STEPS + BIG_HOLD_STEPS).fill("lookback"),
  ...Array(MED_FACE_STEPS).fill("neutral"),
  ...Array(MED_LOOKUP_STEPS).fill("lookup"),
  ...Array(BITE[0][1]).fill("lookup"),
  ...Array(BITE_STEPS).fill("bitten"), // from the first snap to the second
  ...Array(BITE_STEPS - BITE[0][1] + BITE2_HOLD).fill("gone"),
];
const MED_FOLLOW_X = MED_STOP_NOSE - MED_END_RIGHT;
const MED_FACE_AT = BIG_AT + (BIG_RUN_STEPS + BIG_HOLD_STEPS) * STEP_MS;

// The drawn plume (smoke.svg, lifted out of bg.svg) rises from the crater and thins away on a loop. Two copies run half a
// cycle apart so there is always one plume forming while the other drifts off.
const PLUME_MS = 4000;
const PLUME_RISE = 70; // px it drifts up over one cycle
const PLUME_LOOPS = 12; // finite so the render script can measure the clip length

const INK = SCRIBBLE_INK;
// Same white as the Figma frames: white with a faint muted wash towards the bottom right.
const PAPER = "linear-gradient(-62.37deg, rgba(244,245,247,0.5) 8.38%, #fff 47.1%), #fff";

// The opening's paper background with the hand-written line (Figma 264:200). The ref'd copy is the one that scribbles on.
function PaperDawn({ dawnRef }: { dawnRef?: React.Ref<SVGSVGElement> }) {
  return (
    <div className="absolute inset-0" style={{ background: PAPER }}>
      <Scribble line={DAWN} ref={dawnRef} style={{ top: "50%", translate: "0 -50%" }} />
    </div>
  );
}

// Act 2 frames: dark, type in Geist Medium 72px.
function DarkFrame({ ref, style, children }: { ref?: React.Ref<HTMLDivElement>; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div ref={ref} className="absolute inset-0 opacity-0" style={{ background: ACT2_BG, ...style }}>
      {children}
    </div>
  );
}
const ACT2_TYPE: React.CSSProperties = { fontFamily: "var(--font-geist)", fontWeight: 500, fontSize: cq(72), lineHeight: "normal", color: ACT2_INK, whiteSpace: "nowrap" };
// Figma 264:202: centred.
function DawnType() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <p style={ACT2_TYPE}>{DAWN.text}</p>
    </div>
  );
}
// Title card, Figma 267:19. "introducing": Geist Regular 56px, 2.8px tracking, orange. "IX PATTERNS": Geist Light 128px,
// 19.2px tracking, white. Left/top edges from the frame.
// `at` is when it starts in the clip: ACT1_END in the full film, 0 on its own.
function TitleCard({ at, ...p }: ClipProps & { at: number }) {
  const intro = useRef<HTMLDivElement>(null);
  const introText = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const shapes = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const icon = useRef<HTMLDivElement>(null);
  const iconFill = useRef<SVGPathElement>(null);
  const label = useRef<HTMLParagraphElement>(null);
  const plus = useRef<SVGSVGElement>(null);
  const blocksIcon = useRef<SVGSVGElement>(null);
  const blocksLabel = useRef<HTMLParagraphElement>(null);
  const plus2 = useRef<SVGSVGElement>(null);
  const people = useRef<SVGSVGElement>(null);
  const collabLabel = useRef<HTMLParagraphElement>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const { speed, reduced } = p;
    const anims: Animation[] = [];
    const MORPH_AT = at + MORPH_START;
    // Runs the clip to the end of the title card, the empty dark frame; also the timeline origin the condense animations share.
    const clock = play(root.current!, [{ opacity: 1 }, { opacity: 1 }], { duration: TITLE_END, delay: at, easing: "linear", fill: "none" }, speed, anims);
    const letters = [...word.current!.querySelectorAll<HTMLElement>("[data-c]")].filter((c) => c.textContent!.trim());
    const blocks = [...shapes.current!.children] as HTMLElement[];
    // Refit once Geist has loaded and whenever the stage resizes, rebuilding the condense from the new layout.
    // The morph is built from the fitted layout too, so it is rebuilt with the condense, and first, so the condense
    // animations stack on top of it.
    let squeeze: Animation[] = [];
    const fit = () => {
      squeeze.forEach((a) => a.cancel());
      squeeze = [];
      const fits = fitShapes(letters, blocks, SHAPES, SHAPE_GAP);
      const boxFit = fitBox(intro.current!, box.current!);
      const morph = { ms: MORPH_MS, handover: MORPH_HANDOVER };
      letters.forEach((l, i) => {
        if (blocks[i]) stretchInto(l, blocks[i], fits[i].ink, fits[i].box, { l: l.offsetLeft, t: l.offsetTop },
          MORPH_AT + i * MORPH_STAGGER, clock.startTime, speed, reduced, squeeze, morph);
      });
      // "introducing" goes with the first letter, stretching out into its box.
      const it = introText.current!;
      if (boxFit) stretchInto(it, box.current!, boxFit.ink, boxFit.box, { l: it.offsetLeft, t: it.offsetTop },
        MORPH_AT, clock.startTime, speed, reduced, squeeze, morph);
      squeeze.push(...condense(root.current!, word.current!, intro.current!, blocks, box.current!, ring.current!, dot.current!, icon.current!, iconFill.current!, label.current!, plus.current!, blocksIcon.current!, blocksLabel.current!, plus2.current!, people.current!, collabLabel.current!, at, clock.startTime, speed, reduced));
      if (clock.playState === "paused") squeeze.forEach((a) => { a.pause(); a.currentTime = clock.currentTime; });
    };
    fit();
    document.fonts.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(word.current!);
    return () => {
      ro.disconnect();
      squeeze.forEach((a) => a.cancel());
      anims.forEach((a) => a.cancel());
    };
  }, [p.runKey, p.speed, p.reduced, at]);

  return (
    <div ref={root} className="absolute inset-0">
      <div ref={intro} className="absolute" style={{ left: cq(960 - 159), top: cq(540 - 164) }}>
        {/* Sibling of the text so fitBox can place it from the text's offsets; it stays when the text fades. */}
        <div ref={box} className="absolute box-border opacity-0" style={{ border: `${cq(4)} solid ${BOX_ORANGE}` }} />
        <div ref={introText}>
          <RollText {...p} text="introducing" startDelay={at + INTRO_AT} duration={INTRO_ROLL_MS}
            style={{ fontFamily: "var(--font-geist)", fontWeight: 400, fontSize: cq(56), letterSpacing: cq(2.8), lineHeight: "normal", color: ACT2_ACCENT }} />
        </div>
      </div>
      <div ref={word} className="absolute" style={{ left: cq(960 - 473), top: cq(540 - 83) }}>
        <BounceText {...p} text={TITLE_CARD_TEXT} startDelay={at + TITLE_CARD_AT} color={ACT2_INK} pace={BOUNCE_PACE}
          className="font-geist font-light whitespace-nowrap leading-normal text-[6.6667cqw] tracking-[1cqw]" />
        {/* In the same box as the letters so fitShapes can place each shape from its letter's offsets. */}
        <div ref={shapes} className="pointer-events-none absolute inset-0">
          {SHAPES.map((s, i) => (
            <div key={i} className="absolute box-border opacity-0"
              style={{ border: `${cq(4)} solid ${ACT2_INK}`, borderRadius: s.round ? "50%" : 0 }} />
          ))}
        </div>
      </div>
      {/* The rest of the ring round the circle (the top bar is the box). condense places them. */}
      <div ref={ring} className="pointer-events-none absolute inset-0">
        {Array.from({ length: RING_COUNT - 1 }, (_, i) => (
          <div key={i} className="absolute box-border opacity-0" style={{ border: `${cq(4)} solid ${BOX_ORANGE}` }} />
        ))}
      </div>
      {/* The dot the ring collapses into. condense places it. */}
      <div ref={dot} className="pointer-events-none absolute rounded-full opacity-0" style={{ background: BOX_ORANGE }} />
      {/* The document icon, Specs, on the left (Figma 290:30). condense places it. */}
      <div ref={icon} className="pointer-events-none absolute opacity-0">
        <DocumentIcon fillRef={iconFill} />
      </div>
      {/* The icon's label (Figma 291:68), which rolls in under it. condense places it. */}
      <p ref={label} className="pointer-events-none absolute opacity-0"
        style={{ ...ACT2_TYPE, fontWeight: 400, fontSize: cq(48), transform: "translate(-50%, -50%)" }}>
        {WORD_TEXT}
      </p>
      {/* The plus left of the blocks (Figma 290:55), and the second one (Figma 296:139) right of them. */}
      <PlusPop ref={plus} cx={BLOCKS_CX - ROW_STEP} />
      <PlusPop ref={plus2} cx={BLOCKS_CX + ROW_STEP} drawn />
      {/* The people (Figma 296:142), right of the second plus, and their label. */}
      <PeopleIcon ref={people} style={{ left: cq(PEOPLE_CX - 120), top: cq(PLUS_CY - 120), width: cq(240), height: cq(240) }} />
      <p ref={collabLabel} className="pointer-events-none absolute opacity-0"
        style={{ ...ACT2_TYPE, fontWeight: 400, fontSize: cq(48), transform: "translate(-50%, -50%)" }}>
        {COLLAB_WORD_TEXT}
      </p>
      {/* The blocks (Figma 298:46), Patterns, in the middle: the dot swells into them. condense fits them together. */}
      <BlocksIcon ref={blocksIcon} style={{ left: cq(BLOCKS_CX - 120), top: cq(PLUS_CY - 120), width: cq(240), height: cq(240) }} />
      {/* Their label (Figma 296:125). condense places it. */}
      <p ref={blocksLabel} className="pointer-events-none absolute opacity-0"
        style={{ ...ACT2_TYPE, fontWeight: 400, fontSize: cq(48), transform: "translate(-50%, -50%)" }}>
        {BLOCKS_WORD_TEXT}
      </p>
    </div>
  );
}

// The title card on its own, starting from the empty dark frame Act 1 ends on.
export function PatternsTitle(p: ClipProps) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: ACT2_BG }}>
      <TitleCard {...p} at={0} />
    </div>
  );
}

// Act 1 alone: the dinosaurs through to the dark frame after "...a new era dawns".
export function PatternsAct1(p: ClipProps) {
  return <Patterns {...p} part="act1" />;
}

export function Patterns({ runKey, speed, reduced, part = "full" }: ClipProps & { part?: "full" | "act1" }) {
  const title = useRef<SVGSVGElement>(null);
  const mosaic = useRef<SVGSVGElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const dino = useRef<HTMLDivElement>(null);
  const med = useRef<HTMLDivElement>(null);
  const mds = useRef<SVGSVGElement>(null);
  const first = useRef<SVGSVGElement>(null);
  const bigger = useRef<SVGSVGElement>(null);
  const big = useRef<HTMLDivElement>(null);
  const pui = useRef<SVGSVGElement>(null);
  const louder = useRef<SVGSVGElement>(null);
  const now = useRef<SVGSVGElement>(null);
  const meteor = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const cut = useRef<HTMLDivElement>(null);
  const dawn = useRef<SVGSVGElement>(null);
  const glitchLayer = useRef<HTMLDivElement>(null);
  const band = useRef<HTMLDivElement>(null);
  const act2 = useRef<HTMLDivElement>(null);
  const noise = useRef<HTMLDivElement>(null);
  const slate = useRef<HTMLDivElement>(null);
  const dawnType = useRef<HTMLDivElement>(null);
  const jungle = useRef<HTMLDivElement>(null);
  const space = useRef<HTMLDivElement>(null);
  const streaks = useRef<HTMLDivElement>(null);
  const bigLunge = useRef<HTMLDivElement>(null);
  const medFlip = useRef<HTMLDivElement>(null);
  const off = useRef<HTMLDivElement>(null);
  const flip = useRef<HTMLDivElement>(null);
  const hop = useRef<HTMLDivElement>(null);
  const follow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anims: Animation[] = [];

    scribble(title.current!, TEXT_AT, speed, reduced, anims, TITLE_PACE);
    play(title.current!, [{ opacity: 1 }, { opacity: 0 }], { duration: OUT_MS, delay: OUT_AT, easing: "ease-in" }, speed, anims);

    // The prehistoric scene (with its smoke) fades in once the line has gone.
    play(scene.current!, [{ opacity: 0 }, { opacity: 1 }], { duration: BG_MS, delay: BG_AT, easing: "ease-in-out" }, speed, anims);
    scene.current!.querySelectorAll<HTMLImageElement>("[data-plume]").forEach((img, i) => {
      const a = play(
        img,
        [
          { opacity: 0, transform: "translateY(0) scale(0.85)" },
          { opacity: 1, transform: `translateY(${cq(-PLUME_RISE * 0.3)}) scale(0.95)`, offset: 0.3 },
          { opacity: 0, transform: `translateY(${cq(-PLUME_RISE)}) scale(1.1)` },
        ],
        { duration: PLUME_MS, delay: BG_AT - (i * PLUME_MS) / 2, easing: "linear" },
        speed,
        anims,
      );
      a.effect!.updateTiming({ iterations: PLUME_LOOPS });
    });

    // Glide in from off the right edge, easing only over the last strides so the feet don't skid.
    play(
      dino.current!,
      [{ transform: `translateX(${cq(1920 - DINO_END_X + 40)})` }, { transform: "translateX(0)" }],
      { duration: RUN_MS, delay: RUN_AT, easing: "cubic-bezier(0.3, 0.2, 0.45, 1)" },
      speed,
      anims,
    );
    // Flick-book: exactly one drawing is visible on each step, switched with hard cuts.
    dino.current!.querySelectorAll<HTMLImageElement>("[data-pose]").forEach((img) => {
      const pose = img.dataset.pose;
      const n = TIMELINE.length;
      const frames: Keyframe[] = TIMELINE.map((p, k) => ({ offset: k / n, opacity: p === pose ? 1 : 0, easing: "steps(1, end)" }));
      frames.push({ offset: 1, opacity: TIMELINE[n - 1] === pose ? 1 : 0 });
      play(img, frames, { duration: n * STEP_MS, delay: RUN_AT, easing: "linear" }, speed, anims);
    });

    // The hop: up and back down while the jump drawing shows.
    play(
      hop.current!,
      [{ transform: "translateY(0)" }, { transform: `translateY(${cq(-JUMP_LIFT)})`, easing: "cubic-bezier(0.55, 0, 1, 0.45)" }, { transform: "translateY(0)" }],
      { duration: JUMP_STEPS * STEP_MS, delay: JUMP_AT, easing: "cubic-bezier(0, 0.55, 0.45, 1)" },
      speed,
      anims,
    );
    // It turns to face right (mirrored) and runs off, picking up speed as it goes.
    play(flip.current!, [{ transform: "scaleX(1)" }, { transform: "scaleX(-1)" }], { duration: 1, delay: OFF_AT, easing: "steps(1, start)" }, speed, anims);
    play(
      off.current!,
      [{ transform: "translateX(0)" }, { transform: `translateX(${cq(1920 - DINO_END_X + 40)})` }],
      { duration: OFF_STEPS * STEP_MS, delay: OFF_AT, easing: "cubic-bezier(0.5, 0, 0.8, 0.6)" },
      speed,
      anims,
    );
    // The medium one follows, easing to a stop a little right of centre.
    play(
      follow.current!,
      [{ transform: "translateX(0)" }, { transform: `translateX(${cq(MED_FOLLOW_X)})` }],
      { duration: MED_FOLLOW_STEPS * STEP_MS, delay: MED_FOLLOW_AT, easing: "cubic-bezier(0.4, 0, 0.3, 1)" },
      speed,
      anims,
    );

    play(medFlip.current!, [{ transform: "scaleX(1)" }, { transform: "scaleX(-1)" }], { duration: 1, delay: MED_FACE_AT, easing: "steps(1, start)" }, speed, anims);

    play(
      bigLunge.current!,
      [{ transform: "translateX(0)" }, { transform: `translateX(${cq(BIG_LUNGE)})` }],
      { duration: BITE[0][1] * STEP_MS, delay: BITE_AT, easing: "cubic-bezier(0.3, 0, 0.2, 1)" },
      speed,
      anims,
    );

    // Big dinosaur: the same glide-and-flick from the left.
    play(
      big.current!,
      [{ transform: `translateX(${cq(-BIG_END_RIGHT - 40)})` }, { transform: "translateX(0)" }],
      { duration: BIG_RUN_STEPS * STEP_MS, delay: BIG_AT, easing: "cubic-bezier(0.3, 0.2, 0.45, 1)" },
      speed,
      anims,
    );
    big.current!.querySelectorAll<HTMLImageElement>("[data-pose]").forEach((img) => {
      const pose = img.dataset.pose;
      const n = BIG_TIMELINE.length;
      const frames: Keyframe[] = BIG_TIMELINE.map((p, k) => ({ offset: k / n, opacity: p === pose ? 1 : 0, easing: "steps(1, end)" }));
      frames.push({ offset: 1, opacity: BIG_TIMELINE[n - 1] === pose ? 1 : 0 });
      play(img, frames, { duration: n * STEP_MS, delay: BIG_AT, easing: "linear" }, speed, anims);
    });

    // Medium dinosaur: same glide-and-flick as the small one, from the other side.
    play(
      med.current!,
      [{ transform: `translateX(${cq(-MED_END_RIGHT - 40)})` }, { transform: "translateX(0)" }],
      { duration: MED_RUN_MS, delay: MED_AT, easing: "cubic-bezier(0.3, 0.2, 0.45, 1)" },
      speed,
      anims,
    );
    med.current!.querySelectorAll<HTMLImageElement>("[data-pose]").forEach((img) => {
      const pose = img.dataset.pose;
      const n = MED_TIMELINE.length;
      const frames: Keyframe[] = MED_TIMELINE.map((p, k) => ({ offset: k / n, opacity: p === pose ? 1 : 0, easing: "steps(1, end)" }));
      frames.push({ offset: 1, opacity: MED_TIMELINE[n - 1] === pose ? 1 : 0 });
      play(img, frames, { duration: n * STEP_MS, delay: MED_AT, easing: "linear" }, speed, anims);
    });

    scribble(mds.current!, MDS_AT, speed, reduced, anims);
    play(mds.current!, [{ opacity: 1 }, { opacity: 0 }], { duration: OUT_MS, delay: MDS_OUT_AT, easing: "ease-in" }, speed, anims);
    scribble(mosaic.current!, MOSAIC_AT, speed, reduced, anims);
    play(mosaic.current!, [{ opacity: 1 }, { opacity: 0 }], { duration: OUT_MS, delay: MOSAIC_OUT_AT, easing: "ease-in" }, speed, anims);
    scribble(now.current!, NOW_AT, speed, reduced, anims);
    play(now.current!, [{ opacity: 1 }, { opacity: 0 }], { duration: OUT_MS, delay: NOW_OUT_AT, easing: "ease-in" }, speed, anims);
    scribble(louder.current!, LOUDER_AT, speed, reduced, anims);
    play(louder.current!, [{ opacity: 1 }, { opacity: 0 }], { duration: OUT_MS, delay: LOUDER_OUT_AT, easing: "ease-in" }, speed, anims);
    scribble(pui.current!, PUI_AT, speed, reduced, anims);
    play(pui.current!, [{ opacity: 1 }, { opacity: 0 }], { duration: OUT_MS, delay: PUI_OUT_AT, easing: "ease-in" }, speed, anims);
    scribble(bigger.current!, BIGGER_AT, speed, reduced, anims);
    play(bigger.current!, [{ opacity: 1 }, { opacity: 0 }], { duration: OUT_MS, delay: BIGGER_OUT_AT, easing: "ease-in" }, speed, anims);
    scribble(first.current!, FIRST_AT, speed, reduced, anims);
    play(first.current!, [{ opacity: 1 }, { opacity: 0 }], { duration: OUT_MS, delay: FIRST_OUT_AT, easing: "ease-in" }, speed, anims);

    // Speed zoom out through the middle of the frame, one frame then the next. The jungle pulls away into the dark,
    // gathering speed with a little motion blur, and fades out as it goes; once it's gone, space (stars, Earth) fades in,
    // still pulling back, and eases to its resting size as the zoom lands.
    const spotO = `${cq(SPOT_XY[0])} ${cq(SPOT_XY[1])}`;
    jungle.current!.style.transformOrigin = spotO;
    space.current!.querySelector<HTMLElement>("[data-space-in]")!.style.transformOrigin = spotO;
    play(
      jungle.current!,
      [
        { transform: "scale(1)", filter: "blur(0px)", opacity: 1 },
        { transform: `scale(${1 - (1 - JUNGLE_END_SCALE) * 0.45})`, filter: `blur(${cq(2)})`, opacity: 1, offset: 0.35 },
        { transform: `scale(${JUNGLE_END_SCALE})`, filter: `blur(${cq(3)})`, opacity: 0 },
      ],
      { duration: JUNGLE_OUT_MS, delay: ZOOM_AT, easing: "cubic-bezier(0.55, 0, 0.85, 0.45)", fill: "forwards" },
      speed,
      anims,
    );
    // The dark behind space is up from the start of the zoom, so the jungle fades out to it.
    play(space.current!, [{ opacity: 1 }, { opacity: 1 }], { duration: 1, delay: ZOOM_AT, easing: "steps(1, start)", fill: "forwards" }, speed, anims);
    play(
      space.current!.querySelector("[data-space-in]")!,
      [
        { transform: `scale(${SPACE_START_SCALE})`, opacity: 0 },
        { opacity: 1, offset: 0.45 },
        { transform: "scale(1)", opacity: 1 },
      ],
      { duration: ZOOM_MS - SPACE_IN_AT, delay: ZOOM_AT + SPACE_IN_AT, easing: "cubic-bezier(0.2, 0.7, 0.4, 1)", fill: "forwards" },
      speed,
      anims,
    );
    // Earth's black outlines ink in just behind its fills, so the planet arrives soft and sharpens as it settles.
    play(space.current!.querySelector("[data-earth=lines]")!, [{ opacity: 0 }, { opacity: 1 }],
      { duration: EARTH_LINES_MS, delay: ZOOM_AT + EARTH_LINES_AT, easing: "ease-out", fill: "forwards" }, speed, anims);
    // Speed streaks rush outward from the spot during the zoom.
    streaks.current!.querySelectorAll<HTMLElement>("[data-streak]").forEach((el, i) => {
      play(
        el,
        [
          { opacity: 0, transform: `rotate(${el.dataset.a}deg) translateX(${cq(30)}) scaleX(0.2)` },
          { opacity: 0.9, transform: `rotate(${el.dataset.a}deg) translateX(${cq(300)}) scaleX(1)`, offset: 0.4 },
          { opacity: 0, transform: `rotate(${el.dataset.a}deg) translateX(${cq(1300)}) scaleX(1.6)` },
        ],
        { duration: ZOOM_MS * 0.7, delay: ZOOM_AT + 60 + (i % 5) * 40, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
        speed,
        anims,
      );
    });

    // The meteor flies in on a straight line, accelerating, turned to face along its path (the drawing heads left, 180deg).
    const k = METEOR_W / METEOR_SRC[0];
    const heading = (Math.atan2(METEOR_TO[1] - METEOR_FROM[1], METEOR_TO[0] - METEOR_FROM[0]) * 180) / Math.PI - 180;
    const at = (p: readonly [number, number]) => `translate(${cq(p[0] - METEOR_ROCK[0] * k)}, ${cq(p[1] - METEOR_ROCK[1] * k)}) rotate(${heading}deg)`;
    play(
      meteor.current!,
      [
        { opacity: 1, transform: at(METEOR_FROM) },
        { opacity: 1, transform: at(METEOR_TO) },
      ],
      { duration: METEOR_MS, delay: METEOR_AT, easing: "cubic-bezier(0.45, 0, 0.85, 0.5)" },
      speed,
      anims,
    );

    // Impact: a hard cut to the light background, which holds. No explosion.
    play(cut.current!, [{ opacity: 1 }, { opacity: 1 }], { duration: 1, delay: HIT_AT, easing: "steps(1, start)", fill: "forwards" }, speed, anims);

    // "a new era dawns", scribbled on the paper.
    scribble(dawn.current!, DAWN_AT, speed, reduced, anims);
    // Full-frame glitch into Act 2 (GlitchTransition in the library).
    glitch({ layer: glitchLayer.current!, incoming: act2.current!, band: band.current!, slate: slate.current!, noise: [...noise.current!.children] as HTMLElement[] },
      { at: GLITCH_AT, seed: 23, inkFrom: INK, inkTo: ACT2_INK, noiseY: NOISE_Y }, speed, reduced, anims);

    // "...a new era dawns" fades out, clearing the way for the title card (TitleCard runs its own roll and bounce).
    play(dawnType.current!, [{ opacity: 1 }, { opacity: 0 }], { duration: DAWN_OUT_MS, delay: DAWN_OUT_AT, easing: "ease-in", fill: "forwards" }, speed, anims);
    return () => anims.forEach((a) => a.cancel());
  }, [runKey, speed, reduced, part]);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: OFF_BG }}>
    {/* The picture itself, so the CRT switch-off can squash all of it at once. */}
    <div ref={screen} className="absolute inset-0 overflow-hidden" style={{ background: PAPER }}>
    {/* Everything the impact jolts. */}
    <div className="absolute inset-0">
    {/* Space: the dark the jungle fades out to, then stars and Earth fading in (data-space-in), then the meteor strike. */}
    <div ref={space} className="absolute inset-0 opacity-0" style={{ background: OFF_BG }}>
      <div data-space-in className="absolute inset-0 opacity-0">
        <img src="/patterns/stars.svg" alt="" className="absolute inset-0 size-full" />
        {/* earth.svg split in two: its fills, and its black outlines, which come in late (EARTH_LINES_AT). */}
        {["fill", "lines"].map((part) => (
          <img
            key={part}
            data-earth={part}
            src={`/patterns/earth-${part}.svg`}
            alt=""
            className={`absolute max-w-none ${part === "lines" ? "opacity-0" : ""}`}
            style={{ left: cq(EARTH_AT_XY[0] - EARTH_W / 2), top: cq(EARTH_AT_XY[1] - EARTH_W / 2), width: cq(EARTH_W) }}
          />
        ))}
      </div>
    </div>
    {/* The jungle: everything up to the speed zoom out, which shrinks it into its spot on Earth. */}
    <div ref={jungle} className="absolute inset-0 overflow-hidden" style={{ background: PAPER }}>
      <div ref={scene} className="absolute inset-0 opacity-0">
        {/* Colours in bg.svg are the Figma vector's greys mixed 18% towards white, so it reads fainter without transparency.
            The lava is brand orange #F15D22 with two darker shades of it: #CD4F1D (85%) and #AE4318 (72%). */}
        <img src="/patterns/bg.svg" alt="" className="absolute inset-0 size-full" />
        {/* Origin at the crater so the plume swells out of it. */}
        {[0, 1].map((i) => (
          <img key={i} data-plume src="/patterns/smoke.svg" alt="" className="absolute inset-0 size-full opacity-0" style={{ transformOrigin: "72.7% 32%" }} />
        ))}
      </div>

      <Scribble line={TITLE} ref={title} style={{ top: "50%", translate: "0 -50%" }} />

      {/* Each drawing carries its own white fill so the dinosaur hides the scene behind it. Feet share one ground line. */}
      <div
        ref={dino}
        className="absolute"
        style={{ left: cq(DINO_END_X), top: cq(DINO_FEET_Y), width: cq(DINO_W), transform: `translateX(${cq(1920 - DINO_END_X + 40)})` }}
      >
        {/* Nested so the run off, the turn and the hop each own one transform. */}
        <div ref={off} className="absolute inset-0">
          <div ref={flip} className="absolute inset-0">
            <div ref={hop} className="absolute inset-0">
              {POSES.map((pose) => (
                <img
                  key={pose}
                  data-pose={pose}
                  src={`/patterns/dino-${pose}.svg`}
                  alt=""
                  className="absolute right-0 bottom-0 max-w-none"
                  style={{ opacity: pose === "neutral" ? 1 : 0, width: cq(POSE_W[pose]), right: cq(-(POSE_RIGHT[pose] ?? 0)), bottom: cq(-(POSE_DOWN[pose] ?? 0)) }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Faces right; drawings pinned at the bottom left (the tail end). Fills are generated from the outlines. */}
      <div
        ref={med}
        className="absolute"
        style={{ left: cq(MED_END_RIGHT - MED_W.neutral), top: cq(DINO_FEET_Y), width: cq(MED_W.neutral), transform: `translateX(${cq(-MED_END_RIGHT - 40)})` }}
      >
        <div ref={follow} className="absolute inset-0">
          <div ref={medFlip} className="absolute inset-0" style={{ transformOrigin: `${cq(MED_FEET_X)} 0` }}>
          {(Object.keys(MED_W) as (keyof typeof MED_W)[]).filter((p) => p !== "gone").map((pose) => (
            <img
              key={pose}
              data-pose={pose}
              src={`/patterns/med-${pose}.svg`}
              alt=""
              className="absolute bottom-0 left-0 max-w-none"
              style={{ opacity: pose === "neutral" ? 1 : 0, width: cq(MED_W[pose]), left: cq(MED_LEFT[pose] ?? 0), translate: pose === "fwd" || pose === "back" ? `0 ${cq(-MED_BOUNCE)}` : undefined, scale: pose === "lookup" || pose === "bitten" ? "-1 1" : undefined }}
            />
          ))}
          </div>
        </div>
      </div>

      {/* Faces right, pulling up behind the medium one; drawings pinned at the bottom left (the tail end). */}
      <div
        ref={big}
        className="absolute"
        style={{ left: cq(BIG_END_RIGHT - BIG_W.neutral), top: cq(DINO_FEET_Y), width: cq(BIG_W.neutral), transform: `translateX(${cq(-BIG_END_RIGHT - 40)})` }}
      >
        <div ref={bigLunge} className="absolute inset-0">
        {(Object.keys(BIG_W) as (keyof typeof BIG_W)[]).map((pose) => (
          <img
            key={pose}
            data-pose={pose}
            src={`/patterns/big-${pose}.svg`}
            alt=""
            className="absolute bottom-0 left-0 max-w-none"
            style={{
              opacity: pose === "neutral" ? 1 : 0,
              width: cq(BIG_W[pose]),
              bottom: cq(-(BIG_DROP[pose] ?? 0)),
              left: cq(BIG_LEFT[pose] ?? 0),
              translate: pose === "fwd" || pose === "back" ? `0 ${cq(-BIG_BOUNCE)}` : undefined,
            }}
          />
        ))}
        </div>
      </div>

      <Scribble line={MOSAIC} ref={mosaic} style={{ top: cq(MOSAIC_Y - (MOSAIC.h + 8) / 2) }} />
      <Scribble line={FIRST} ref={first} style={{ top: cq(MOSAIC_Y - (FIRST.h + 8) / 2) }} />
      <Scribble line={NOW} ref={now} style={{ top: cq(MOSAIC_Y - (NOW.h + 8) / 2) }} />
      <Scribble line={LOUDER} ref={louder} style={{ top: cq(MOSAIC_Y - (LOUDER.h + 8) / 2) }} />
      <Scribble line={PUI} ref={pui} style={{ top: cq(MOSAIC_Y - (PUI.h + 8) / 2) }} />
      <Scribble line={BIGGER} ref={bigger} style={{ top: cq(MOSAIC_Y - (BIGGER.h + 8) / 2) }} />
      <Scribble line={MDS} ref={mds} style={{ top: cq(MOSAIC_Y - (MDS.h + 8) / 2) }} />
    </div>

    <div ref={streaks} className="absolute inset-0 pointer-events-none">
      {Array.from({ length: 16 }, (_, i) => (
        <div
          key={i}
          data-streak
          data-a={(i * 360) / 16 + (i % 3) * 7}
          className="absolute bg-white opacity-0"
          style={{ left: cq(SPOT_XY[0]), top: cq(SPOT_XY[1]), width: cq(160 + (i % 4) * 60), height: cq(3), transformOrigin: "0 50%", borderRadius: cq(2) }}
        />
      ))}
    </div>

    {/* Positioned by its transform alone; hidden until it falls. */}
    <div
      ref={meteor}
      className="absolute top-0 left-0 opacity-0"
      style={{
        width: cq(METEOR_W),
        height: cq(METEOR_W * (METEOR_SRC[1] / METEOR_SRC[0])),
        transformOrigin: `${cq(METEOR_ROCK[0] * (METEOR_W / METEOR_SRC[0]))} ${cq(METEOR_ROCK[1] * (METEOR_W / METEOR_SRC[0]))}`,
      }}
    >
      <img src="/patterns/meteor.svg" alt="" className="absolute inset-0 size-full" />
    </div>

    </div>

      {/* The cut on impact: the opening's paper covers everything and stays, with "a new era dawns" written on it (264:200).
          Wrapped with the Act 2 frame so the full-frame glitch moves both. */}
      <div ref={cut} className="absolute inset-0 opacity-0">
        <div ref={glitchLayer} className="absolute inset-0">
          <PaperDawn dawnRef={dawn} />
          {/* Act 2: "...a new era dawns", which fades for the title card. */}
          <DarkFrame ref={act2}>
            <div ref={dawnType} className="absolute inset-0">
              <DawnType />
            </div>
            {part === "full" && <TitleCard runKey={runKey} speed={speed} reduced={reduced} at={ACT1_END} />}
          </DarkFrame>
          {/* Displaced band for the glitch: a slice of the incoming frame, torn sideways across the picture. */}
          <div ref={band} className="absolute inset-0 opacity-0" aria-hidden>
            <DarkFrame style={{ opacity: 1 }}>
              <DawnType />
            </DarkFrame>
          </div>
          <div ref={slate} className="absolute inset-0 opacity-0" style={{ background: GLITCH_SLATE }} aria-hidden />
          <div ref={noise} className="pointer-events-none absolute inset-0" aria-hidden>
            {Array.from({ length: NOISE_LINES }, (_, i) => (
              <div key={i} data-noise className="absolute opacity-0" />
            ))}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
