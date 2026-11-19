import { type ComponentType, useState } from "react";
import type { ClipProps } from "./play";
import { BounceTitle } from "./clips/BounceTitle";
import { GlitchDecode } from "./clips/GlitchDecode";
import { WordReveal } from "./clips/WordReveal";
import { RollUp } from "./clips/RollUp";
import { TypeCaret } from "./clips/TypeCaret";
import { PopText } from "./clips/PopText";
import { Typewriter } from "./clips/Typewriter";
import { DrawCheck } from "./clips/DrawCheck";
import { IconBurst } from "./clips/IconBurst";
import { GlitchTransition } from "./clips/GlitchTransition";
import { ScribbleText } from "./clips/Scribble";
import { StretchText } from "./clips/StretchText";
import { RollText } from "./clips/RollText";
import { ZoomThrough } from "./clips/ZoomThrough";
import { DAWN } from "./animations/patterns/glyphs";
import { type Settings, Stage, Toolbar } from "./stage";

// Ported from the Patterns film. Each one's props are listed in its file in src/clips.
const GlitchDemo = (p: ClipProps) => <GlitchTransition {...p} at={1200} />;
const ScribbleDemo = (p: ClipProps) => <ScribbleText {...p} line={DAWN} ink="var(--stage-fg)" />;
const StretchDemo = (p: ClipProps) => <StretchText {...p} text="BLOCKS" snap />;
const ROLL_STYLE = { fontFamily: "var(--font-geist)", fontSize: "4cqw", color: "var(--stage-fg)" };
const RollDirDemo = (p: ClipProps) => (
  <div className="flex gap-[6cqw]">
    <div className="grid"><RollText {...p} text="Guidelines" startDelay={300} duration={214} style={ROLL_STYLE} /></div>
    <div className="grid"><RollText {...p} text="Blocks" startDelay={730} duration={214} dir="down" style={ROLL_STYLE} /></div>
    <div className="grid"><RollText {...p} text="Collaboration" startDelay={1160} duration={214} style={ROLL_STYLE} /></div>
  </div>
);

type Clip = { id: string; name: string; kind: "Text" | "SVG" | "Transition"; note: string; Comp: ComponentType<ClipProps> };

const CLIPS: Clip[] = [
  { id: "bounce", name: "Bounce title + drop dot", kind: "Text", note: "Per-character bounce, accent dot drops and squashes (from portfolio)", Comp: BounceTitle },
  { id: "glitch", name: "Glitch decode", kind: "Text", note: "Symbols scramble then resolve left to right", Comp: GlitchDecode },
  { id: "typecaret", name: "Type + caret", kind: "Text", note: "Caret blinks once, keys land with jitter, caret fades (from the portfolio Hello line)", Comp: TypeCaret },
  { id: "pop", name: "Inflate + pop", kind: "Text", note: "Letters swell like bubbles, then pop left to right with a ring and droplets", Comp: PopText },
  { id: "roll", name: "Roll up", kind: "Text", note: "Drum roll from the portfolio intro: new face rolls up into place as the old one rolls away", Comp: RollUp },
  { id: "words", name: "Word reveal", kind: "Text", note: "Blur + rise, accent words travel further and last longer", Comp: WordReveal },
  { id: "type", name: "Prompt typewriter", kind: "Text", note: "Input field types with a blinking caret", Comp: Typewriter },
  { id: "check", name: "Draw check", kind: "SVG", note: "Circle draws, then the tick lands just before it finishes", Comp: DrawCheck },
  { id: "burst", name: "Icon burst", kind: "SVG", note: "Star pops, rays draw outward in the last 20%", Comp: IconBurst },
  { id: "glitch-transition", name: "Glitch transition", kind: "Transition", note: "24 hard cuts over 600ms: jitter, RGB split, torn bands, noise, slate flash. fromFont / toFont set each side's family, weight, size, tracking, colour (from Patterns, \"...a new era dawns\")", Comp: GlitchDemo },
  { id: "scribble", name: "Scribble", kind: "Text", note: "Pen traces each glyph's outline, then its ink fills in. Lines come from scripts/gen-glyphs.cjs (from Patterns, Act 1)", Comp: ScribbleDemo },
  { id: "stretch", name: "Stretch into shapes", kind: "Text", note: "Each letter stretches out to fill an outlined block, then the row breathes and springs shut into one circle (from the Patterns title card)", Comp: StretchDemo },
  { id: "roll-dir", name: "Roll up / roll down", kind: "Text", note: "RollText now takes dir=\"up\" | \"down\", as the Patterns labels alternate", Comp: RollDirDemo },
  { id: "zoom-through", name: "Zoom through", kind: "Transition", note: "Zoom out to a planet: the wide frame shrinks and rounds into a circle that becomes the planet, its content zooming out inside while the planet's design fades in (for Patterns, jungle to Earth)", Comp: ZoomThrough },
];

export function Playground({ s, set }: { s: Settings; set: (p: Partial<Settings>) => void }) {
  const [replayAll, setReplayAll] = useState(0);
  return (
    <>
      <Toolbar title="Playground" s={s} set={set} />
      <div key={replayAll} className="grid gap-8 md:grid-cols-2">
        {CLIPS.map((c) => (
          <Stage key={c.id} name={c.name} kind={c.kind} note={c.note} Comp={c.Comp} s={s} />
        ))}
      </div>
      <button className="mt-8 rounded-md bg-white/10 px-3 py-1 text-xs hover:bg-white/20" onClick={() => setReplayAll((k) => k + 1)}>Replay all</button>
    </>
  );
}
