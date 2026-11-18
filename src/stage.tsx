import { type ComponentType, useEffect, useRef, useState } from "react";
import type { ClipProps } from "./play";
import { setSoundEnabled } from "./sfx";

export const ASPECTS = { "16:9": "16/9", "1:1": "1/1", "9:16": "9/16" } as const;
export type Aspect = keyof typeof ASPECTS;
export const SPEEDS = [0.25, 0.5, 1, 2];

export type Settings = { light: boolean; aspect: Aspect; speed: number; reduced: boolean; sound: boolean };

const btn = (on: boolean) => `rounded-md px-3 py-1 text-xs ${on ? "bg-brand text-white" : "bg-white/10 hover:bg-white/20"}`;

export function Toolbar({ title, s, set }: { title: string; s: Settings; set: (p: Partial<Settings>) => void }) {
  return (
    <header className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
      <h1 className="mr-auto text-xl font-medium">{title}</h1>
      <div className="flex gap-1">
        {(Object.keys(ASPECTS) as Aspect[]).map((a) => (
          <button key={a} className={btn(s.aspect === a)} onClick={() => set({ aspect: a })}>{a}</button>
        ))}
      </div>
      <div className="flex gap-1">
        {SPEEDS.map((v) => (
          <button key={v} className={btn(s.speed === v)} onClick={() => set({ speed: v })}>{v}x</button>
        ))}
      </div>
      <div className="flex gap-1">
        <div role="group" aria-label="Theme" className="flex gap-1">
          <button className={btn(!s.light)} aria-pressed={!s.light} onClick={() => set({ light: false })}>Dark</button>
          <button className={btn(s.light)} aria-pressed={s.light} onClick={() => set({ light: true })}>Light</button>
        </div>
        <button className={btn(s.reduced)} onClick={() => set({ reduced: !s.reduced })}>Reduced motion</button>
        <button
          className={btn(s.sound)}
          aria-pressed={s.sound}
          onClick={() => {
            setSoundEnabled(!s.sound);
            set({ sound: !s.sound });
          }}
        >
          Sound
        </button>
      </div>
    </header>
  );
}

export function Stage({
  name, kind, note, Comp, s, large,
}: { name: string; kind?: string; note?: string; Comp: ComponentType<ClipProps>; s: Settings; large?: boolean }) {
  const [runKey, setRunKey] = useState(0);
  const frame = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === frame.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  // Fullscreen plays it again from the start, letterboxed to the chosen aspect. Everything inside is sized in cq units off
  // the stage's width, so it scales up as drawn.
  const watchFull = async () => {
    await frame.current!.requestFullscreen();
    setRunKey((k) => k + 1);
  };
  const [aw, ah] = ASPECTS[s.aspect].split("/").map(Number);
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">
          {name}
          {kind && <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] tracking-wide text-white/60 uppercase">{kind}</span>}
        </h2>
        <div className="flex gap-1">
          <button onClick={watchFull} className="rounded-md bg-white/10 px-3 py-1 text-xs hover:bg-white/20">Full screen</button>
          <button onClick={() => setRunKey((k) => k + 1)} className="rounded-md bg-white/10 px-3 py-1 text-xs hover:bg-white/20">Replay</button>
        </div>
      </div>
      <div ref={frame} className={full ? "flex items-center justify-center bg-black" : ""}
        onClick={full ? () => setRunKey((k) => k + 1) : undefined} title={full ? "Click to replay, Esc to exit" : undefined}>
      <div
        data-stage
        className={`${s.light ? "stage-light" : ""} relative mx-auto flex items-center justify-center overflow-hidden ${full ? "" : "w-full rounded-xl"} ${!full && large && s.aspect === "9:16" ? "max-w-sm" : ""}`}
        style={{ background: "var(--stage-bg)", aspectRatio: ASPECTS[s.aspect], containerType: "inline-size",
          ...(full ? { width: `min(100vw, ${(100 * aw) / ah}vh)` } : {}) }}
      >
        <Comp runKey={runKey} speed={s.speed} reduced={s.reduced} />
      </div>
      </div>
      {note && <p className="text-xs text-white/50">{note}</p>}
    </section>
  );
}
