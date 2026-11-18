import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { ClipProps } from "../../play";
import "./ai-chat.css";
import iq from "./icons/iq.json";
import appointment from "./icons/appointment.svg?raw";
import arrowRight from "./icons/arrow-right.svg?raw";
import chartLine from "./icons/chart-line.svg?raw";
import checklist from "./icons/checklist.svg?raw";
import chevron from "./icons/chevron.svg?raw";
import glowScreen from "./icons/glow-screen.svg?raw";
import plus from "./icons/plus.svg?raw";
import speech from "./icons/speech.svg?raw";

// The AI workspace hero from the portfolio (~/portfolio/src/components/hero-chat.tsx): a new chat, the prompt typed in
// with the camera pushed in and following the caret, enter, the input docks, Thinking..., and the reply streams in block
// by block with the camera following it. Ported as-is; only the wiring changed: it runs off the playground's runKey,
// speed and reduced props instead of scroll/intro observers and its own Replay button, and its colours live in
// ai-chat.css (scoped to .ai-chat) so they don't clash with the playground's.

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// Figma exports carry the portfolio's dark-theme hexes; swap them for the tokens so the icons follow light and dark.
const TOKEN_FOR_HEX: Record<string, string> = {
  "#FAFAFC": "var(--text)",
  "#D1D0D8": "var(--subtle)",
  "#E4E4EA": "var(--border-strong)",
  "#A1A0AB": "var(--muted)",
  "#51515E": "var(--guide)",
  "#363645": "var(--surface-strong)",
  "#20202D": "var(--surface-raised)",
  "#10101C": "var(--surface)",
  "#060610": "var(--bg)",
  "#9467CC": "var(--accent-purple)",
  "#E9E1F5": "var(--accent-purple-secondary)",
  "#4A3466": "color-mix(in srgb, var(--accent-purple) 50%, black)",
};
const tokenise = (raw: string) =>
  raw
    .replace(/#[0-9a-f]{6}\b/gi, (hex) => TOKEN_FOR_HEX[hex.toUpperCase()] ?? hex)
    .replace(/(<svg[^>]*?)\swidth="[^"]*"\s+height="[^"]*"/, '$1 width="100%" height="100%"');
const icons: Record<string, string> = Object.fromEntries(
  Object.entries({
    appointment, "arrow-right": arrowRight, "chart-line": chartLine, checklist, chevron, "glow-screen": glowScreen, plus, speech,
  }).map(([k, v]) => [k, tokenise(v)]),
);

const W = 400;
const H = 322;
const INPUT_H = 60;
const INPUT_TOP = 139;
const PROMPT = "What’s my first appointment today?";
const ACTIVITIES = [
  { icon: "checklist", strong: "2 tasks", rest: "due today" },
  { icon: "appointment", strong: "8 appointments", rest: "today" },
  { icon: "chart-line", strong: "4 reports", rest: "to run today" },
];
const SUGGESTED = [
  "Show me my calendar and list of appointments for today.",
  "Build patient summary for next appointment.",
  "List all due and outstanding medication reviews assigned to me.",
];
const FOLLOW_UPS = [
  "View Patient Summary for Mr Robert Smith",
  "View Mr Robert Smith’s Clinical Record entries associated with Problem: COPD",
  "Summarise the recent treatment Mr Robert Smith has received for this Problem: COPD",
];

const REPLY_1 = "Your first appointment today is in 12 minutes at 09:15 with Mr Robert Smith.";
const REPLY_3 =
  "Mr Robert Smith has requested this appointment to discuss his current health concerns. He reports a worsening wheeze and persistent cough, with a constant dull headache and aversion to bright lights. From a brief review of Mr Robert Smith’s patient record I can see that he has a recorded COPD Problem already.";

const streamDelay = (word: string) => {
  let d = 20 + Math.random() * 20;
  if (/[.,]$/.test(word)) d += 55 + Math.random() * 35;
  if (Math.random() < 0.1) d += 30;
  return d;
};

function Stream({ text, n }: { text: string; n: number }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <span
          key={i}
          className={cn("transition-[opacity,filter] duration-300 ease-out", n > i ? "opacity-100 blur-0" : "opacity-0 blur-[2px]")}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

const T = {
  startDelay: 1400,
  hold: 750,
  camIn: 700,
  typeLead: 260,
  typeEnd: 480,
  camOut: 450,
  press: 220,
  pressGap: 160,
  blocksOut: 380,
  greetingOut: 440,
  dock: 380,
  bubble: 560,
  thinking: 1800,
  thinkingOut: 240,
  beat: 190,
  card: 340,
  followGap: 390,
  end: 600,
  camHome: 700,
};

const CHAR_MS = 48;
const MOVE = 500;
const PAN = 300;

type Scene = {
  typed: string;
  typing: boolean;
  press: number;
  pressed: boolean;
  blocksOut: boolean;
  greetingOut: boolean;
  docked: boolean;
  bubbleIn: boolean;
  thinkingMounted: boolean;
  thinkingIn: boolean;
  resp: number;
  w1: number;
  w3: number;
  fu: number;
  snap: boolean;
};

const INITIAL: Scene = {
  typed: "", typing: false, press: 0, pressed: false, blocksOut: false, greetingOut: false, docked: false, bubbleIn: false,
  thinkingMounted: false, thinkingIn: false, resp: 0, w1: 0, w3: 0, fu: 0, snap: true,
};

const FINAL: Scene = {
  ...INITIAL, typed: PROMPT, blocksOut: true, greetingOut: true, docked: true, bubbleIn: true, resp: 4, w1: 999, w3: 999, fu: 3,
};

function Icon({ html, size = 12, className }: { html: string; size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="none"
      className={cn("shrink-0", className)} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

function Svg({ html, className }: { html: string; className?: string }) {
  return <span aria-hidden className={cn("block [&>svg]:block [&>svg]:size-full", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex h-7 w-full items-center gap-1 rounded-lg border-[0.5px] border-ai-border-chat bg-ai-chat p-2", className)}>
      {children}
    </div>
  );
}

function ThinkingGrid() {
  const [lit, setLit] = useState<number[]>(() => [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - 0.5).slice(0, 4));
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const tick = (slot: number) => {
      setLit((prev) => {
        const free = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((c) => !prev.includes(c));
        const next = [...prev];
        next[slot] = free[Math.floor(Math.random() * free.length)];
        return next;
      });
      timers[slot] = setTimeout(() => tick(slot), 450 + Math.random() * 100);
    };
    for (let s = 0; s < 4; s++) timers[s] = setTimeout(() => tick(s), 500 + s * 125);
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <span className="relative block size-3 shrink-0 text-ai-muted">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i}
          className={cn("absolute size-[2px] rounded-full bg-current transition-opacity duration-150", lit.includes(i) ? "opacity-100" : "opacity-0")}
          style={{ left: 2 + (i % 3) * 3, top: 2 + Math.floor(i / 3) * 3 }} />
      ))}
    </span>
  );
}

export function AiChat({ runKey, speed, reduced }: ClipProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const camRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const typedRef = useRef<HTMLSpanElement>(null);
  const blocksRef = useRef<(HTMLElement | null)[]>([]);
  const [scale, setScale] = useState<number | null>(null);
  const [playing, setScene] = useState<Scene>(INITIAL);
  const scene = reduced ? FINAL : playing;

  // The mock-up is drawn at 400x322 and scaled to fit the stage (it was a fixed column on the portfolio page).
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(Math.min(entry.contentRect.width / W, entry.contentRect.height / H) * 0.9));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (reduced) return;
    const cam = camRef.current;
    const content = contentRef.current;
    if (!cam || !content) return;
    let cancelled = false;
    const CANCELLED = Symbol("cancelled");
    const ms = (n: number) => n / speed;

    // The camera zooms to show `viewW` mock-up px across the stage (the portfolio measured its wider frame the same way).
    const zoomFor = (viewW: number) => {
      const stage = stageRef.current!;
      const s = Math.min(stage.clientWidth / W, stage.clientHeight / H) * 0.9;
      const fw = stage.clientWidth;
      const z = Math.min(10, Math.max(1.4, fw / (s * viewW)));
      return { z, viewW: fw / (s * z) };
    };
    const aim = (fx: number, fy: number, z: number, dur: number) => {
      cam.style.transitionDuration = `${ms(dur)}ms`;
      cam.style.transform = `translate(${W / 2 - fx * z}px, ${H / 2 - fy * z}px) scale(${z})`;
    };
    const wide = (dur: number) => aim(W / 2, H / 2, 1, dur);
    const top = (node: HTMLElement | null) => {
      let y = 0;
      for (let n = node; n && n !== content; n = n.offsetParent as HTMLElement | null) y += n.offsetTop;
      return y;
    };
    const focusBlock = (i: number, z: number, dur: number) => {
      const b = blocksRef.current[i];
      if (b) aim(W / 2, top(b) + b.offsetHeight / 2, z, dur);
    };
    const wait = async (n: number) => {
      await new Promise((r) => setTimeout(r, ms(n)));
      if (cancelled) throw CANCELLED;
    };
    const patch = (p: Partial<Scene>) => {
      if (!cancelled) setScene((s) => ({ ...s, ...p }));
    };

    // Start clean every run, then let transitions back on.
    setScene(INITIAL);
    wide(0);

    (async () => {
      try {
        await wait(60);
        patch({ snap: false });
        await wait(T.startDelay - 60);
        await wait(T.hold);

        // 02: push in tight on the input, then follow the caret to the right as the prompt is typed
        const typeView = zoomFor(100);
        const inputY = INPUT_TOP + 16;
        const caretFocus = (caretX: number) => Math.max(typeView.viewW / 2, caretX);
        aim(typeView.viewW / 2, inputY, typeView.z, T.camIn);
        patch({ typing: true });
        await wait(T.camIn + T.typeLead);
        // Measure the full prompt once so the camera can make one continuous pan across it
        flushSync(() => patch({ typed: PROMPT }));
        const endX = caretFocus(10 + (typedRef.current?.offsetWidth ?? 0));
        flushSync(() => patch({ typed: "" }));
        const startX = typeView.viewW / 2;
        const duration = ms(PROMPT.length * CHAR_MS);
        await new Promise<void>((resolve, reject) => {
          let t0 = 0;
          let shown = 0;
          const frame = (now: number) => {
            if (cancelled) return reject(CANCELLED);
            if (!t0) t0 = now;
            const p = Math.min(1, (now - t0) / duration);
            const count = Math.min(PROMPT.length, Math.floor(p * PROMPT.length));
            if (count !== shown) {
              shown = count;
              patch({ typed: PROMPT.slice(0, count) });
            }
            const e = p * p * (3 - 2 * p);
            const camX = startX + (endX - startX) * e;
            cam.style.transitionDuration = "0ms";
            cam.style.transform = `translate(${W / 2 - camX * typeView.z}px, ${H / 2 - inputY * typeView.z}px) scale(${typeView.z})`;
            if (p < 1) requestAnimationFrame(frame);
            else {
              patch({ typed: PROMPT });
              resolve();
            }
          };
          requestAnimationFrame(frame);
        });
        await wait(T.typeEnd);

        // 03: pull out to the full mock-up, press enter, tiles and greeting fade, input drops, prompt appears
        wide(T.camOut);
        await wait(T.camOut * 0.6);
        patch({ pressed: true, press: Date.now() });
        await wait(T.press);
        patch({ pressed: false });
        await wait(T.pressGap);
        patch({ blocksOut: true });
        await wait(T.blocksOut);
        patch({ greetingOut: true });
        await wait(T.greetingOut);
        patch({ typing: false, docked: true });
        await wait(T.dock);
        patch({ bubbleIn: true });
        await wait(T.bubble);

        // 04: push in to the reply crop on the thinking indicator, so the reply reveals without a camera change
        const replyView = zoomFor(440);
        focusBlock(1, replyView.z, MOVE);
        patch({ thinkingMounted: true });
        await wait(40);
        patch({ thinkingIn: true });
        await wait(T.thinking);

        // 05: thinking leads straight into the reply, then follow it block by block
        patch({ thinkingIn: false });
        await wait(T.thinkingOut);
        flushSync(() => patch({ thinkingMounted: false, resp: 1 }));
        const stream = async (key: "w1" | "w3", text: string) => {
          const words = text.split(" ");
          for (let i = 1; i <= words.length; i++) {
            flushSync(() => patch({ [key]: i }));
            await wait(streamDelay(words[i - 1]));
          }
        };
        await stream("w1", REPLY_1);
        await wait(T.beat);

        flushSync(() => patch({ resp: 2 }));
        focusBlock(2, replyView.z, PAN + 100);
        await wait(T.card);

        flushSync(() => patch({ resp: 3 }));
        focusBlock(3, replyView.z, PAN + 100);
        await stream("w3", REPLY_3);
        await wait(T.beat);

        flushSync(() => patch({ resp: 4 }));
        focusBlock(4, replyView.z, PAN + 100);
        for (let i = 1; i <= FOLLOW_UPS.length; i++) {
          await wait(T.followGap);
          flushSync(() => patch({ fu: i }));
        }
        await wait(T.end);

        // 06: pull out to the full mock-up
        wide(T.camHome);
      } catch (e) {
        if (e !== CANCELLED) throw e;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [runKey, speed, reduced]);

  // Transition lengths scale with playback speed too.
  const dur = (n: number) => ({ transitionDuration: `${n / speed}ms` });

  const reveal = (n: number) =>
    cn("transition-[opacity,translate] ease-ai-out-expo", scene.resp >= n ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0");

  const arrow = (
    <div className="relative size-3 shrink-0 overflow-clip">
      <Svg html={icons["arrow-right"]} className="absolute inset-[28.13%_20.83%] [&_path]:fill-ai-muted" />
    </div>
  );

  return (
    <div ref={stageRef} className="ai-chat absolute inset-0 flex items-center justify-center overflow-hidden font-ai-body"
      role="img" aria-label="AI workspace: animated example of a chat prompt and reply">
      {/* Not clipped: zoomed in, the camera fills the whole stage, as it filled the portfolio's frame. */}
      <div className="relative" style={{ width: W * (scale ?? 1), height: H * (scale ?? 1) }}>
        <div className={cn("absolute top-0 left-0 origin-top-left", scale === null && "invisible")}
          style={{ width: W, height: H, transform: `scale(${scale ?? 1})` }}>
          <div ref={camRef} className="absolute inset-0 origin-top-left transition-transform ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform">
            <div ref={contentRef} className={cn("absolute inset-0", scene.snap && "[&_*]:transition-none!")}>
              <div aria-hidden style={dur(500)}
                className={cn("pointer-events-none absolute top-[calc(50%+9px)] left-5 h-[240px] w-[360px] -translate-y-1/2 transition-opacity ease-out", scene.greetingOut && "opacity-0")}>
                <Svg html={icons["glow-screen"]} className="ai-glow absolute inset-[-50%_-33.33%]" />
              </div>

              {/* Greeting */}
              <div style={dur(300)}
                className={cn("absolute top-0 left-0 flex w-full flex-col items-center gap-3 transition-opacity ease-out", scene.greetingOut && "opacity-0")}>
                <div className="relative size-[60px] shrink-0">
                  <Svg html={icons.speech} className="absolute inset-[19.79%_11.46%_13.54%_11.46%]" />
                </div>
                <div className="flex w-[244px] flex-col items-center gap-[2px] text-center">
                  <p className="w-full font-display text-[24px] leading-[1.2] font-medium text-ai-text">Hey, Liam</p>
                  <p className="w-full text-[12px] leading-[1.2] text-ai-subtle">Welcome back! Ready to create some magic?</p>
                </div>
              </div>

              {/* Activities + suggested prompts */}
              <div style={dur(300)}
                className={cn("absolute top-[213px] left-0 flex w-full items-start gap-3 transition-opacity ease-out", scene.blocksOut && "opacity-0")}>
                <div className="flex w-[120px] shrink-0 flex-col gap-2">
                  <p className="font-display text-[8px] leading-3 font-medium text-ai-subtle">Today’s activities:</p>
                  <div className="flex flex-col gap-[2px]">
                    {ACTIVITIES.map((a) => (
                      <Chip key={a.icon}>
                        <div className="relative size-3 shrink-0">
                          {a.icon === "checklist" && <div className="absolute top-1/4 right-[14.58%] bottom-1/4 left-[52.08%] bg-ai-text/20" />}
                          <Svg html={icons[a.icon]}
                            className={a.icon === "checklist" ? "absolute inset-[16.66%_8.33%_16.69%_8.33%]" : "absolute inset-0"} />
                        </div>
                        <div className="flex items-center gap-[2px] text-[7px] leading-3 whitespace-nowrap text-ai-text">
                          <p className="font-medium">{a.strong}</p>
                          <p>{a.rest}</p>
                        </div>
                      </Chip>
                    ))}
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <p className="font-display text-[8px] leading-3 font-medium text-ai-subtle">Suggested prompts:</p>
                  <div className="flex flex-col gap-[2px]">
                    {SUGGESTED.map((t) => (
                      <Chip key={t} className="border-ai-border-chat-prompt bg-ai-chat-prompt">
                        <p className="min-w-0 flex-1 text-[7px] leading-3 text-ai-text">{t}</p>
                        {arrow}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>

              {/* Conversation */}
              <div className="absolute top-4 left-0 flex h-[244px] w-full flex-col gap-4 overflow-hidden">
                <div style={dur(600)}
                  className={cn("flex shrink-0 flex-col items-end gap-px self-end transition-[opacity,translate] ease-ai-out-expo",
                    scene.bubbleIn ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}>
                  <div className="rounded-md border-[0.5px] border-ai-border-chat bg-ai-chat p-2 text-[7px] leading-3 font-normal whitespace-nowrap text-ai-text">
                    {PROMPT}
                  </div>
                  <span className="text-[6px] leading-[11px] font-normal whitespace-nowrap text-ai-subtle">Just now</span>
                </div>

                <div className="relative flex shrink-0 flex-col gap-2 text-[7px] leading-3 font-normal text-ai-text">
                  {scene.thinkingMounted && (
                    <div style={dur(200)}
                      className={cn("absolute top-0 left-0 flex items-center gap-[2px] transition-opacity ease-out", scene.thinkingIn ? "opacity-100" : "opacity-0")}>
                      <ThinkingGrid />
                      <span className="ai-shimmer ai-shimmer-strong text-[7px] leading-3 font-normal">Thinking...</span>
                    </div>
                  )}
                  <p ref={(n) => { blocksRef.current[1] = n; }}>
                    <Stream text={REPLY_1} n={scene.w1} />
                  </p>
                  <div ref={(n) => { blocksRef.current[2] = n; }} style={dur(600)}
                    className={cn("flex items-center gap-[5px] rounded-md border border-ai-border-chat bg-ai-chat px-[6px] py-[5px]", reveal(2))}>
                    <span className="flex size-[18px] shrink-0 items-center justify-center rounded-[3px] border-[0.5px] border-ai-border-chat text-ai-text">
                      <Icon html={iq.UserCircle} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col justify-center gap-[2px]">
                      <span className="leading-2 font-medium text-ai-text">SMITH, Robert (Mr)</span>
                      <span className="truncate leading-[10px] font-normal whitespace-pre text-ai-subtle">
                        {"Born: 04-Mar-1967   Patient identifier: 123 456 7890   Sex: Male"}
                      </span>
                    </span>
                    <span className="flex h-5 shrink-0 items-center">
                      <span className="flex h-4 items-center gap-[3px] rounded-[5px] border-[0.5px] border-ai-border-chat bg-ai-chat-prompt px-[5px] py-1 leading-[10px] whitespace-nowrap text-ai-text">
                        View Summary
                        <span className="relative block size-[10px] shrink-0 overflow-clip">
                          <Svg html={icons["arrow-right"]} className="absolute inset-[28.12%_20.83%]" />
                        </span>
                      </span>
                    </span>
                  </div>
                  <p ref={(n) => { blocksRef.current[3] = n; }}>
                    <Stream text={REPLY_3} n={scene.w3} />
                  </p>
                </div>

                <div ref={(n) => { blocksRef.current[4] = n; }} className="flex shrink-0 flex-col items-start">
                  {FOLLOW_UPS.map((t, i) => (
                    <div key={t} style={dur(700)}
                      className={cn("flex items-center gap-1 py-1 text-[7px] leading-3 font-normal whitespace-nowrap text-ai-text transition-[opacity,translate] ease-ai-out-expo",
                        scene.fu > i ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}>
                      <Icon html={iq.KeyReturn} className="-scale-y-100 rotate-180" />
                      {t}
                    </div>
                  ))}
                </div>
              </div>

              {/* Prompt input */}
              <div className="absolute left-0 w-full transition-transform ease-ai-out-expo"
                style={{ top: INPUT_TOP, transform: scene.docked ? `translateY(${H - INPUT_H - INPUT_TOP}px)` : undefined, ...dur(850) }}>
                <div className="rounded-[13px] border-[0.5px] border-ai-border-chat bg-ai-chat">
                  <div className="flex min-h-8 items-center py-[10px] pr-6 pl-[10px] text-[8px] leading-3">
                    {scene.typed || scene.typing ? (
                      <span ref={typedRef} className="text-ai-text">
                        {scene.typed}
                        {scene.typing && <span className="ai-caret ml-px inline-block h-[10px] w-px translate-y-[1px] bg-ai-text" />}
                      </span>
                    ) : (
                      <span className="text-ai-subtle">Ask anything...</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-[6px]">
                    <span className="flex size-4 items-center justify-center rounded-full border-[0.5px] border-ai-border-chat bg-ai-surface-strong p-[3.5px]">
                      <span className="relative block size-2 shrink-0">
                        <span className="absolute -top-[2px] -left-[2px] block size-3">
                          <Svg html={icons.plus} className="absolute inset-1/4" />
                        </span>
                      </span>
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="flex h-4 items-center justify-center gap-[3px] rounded-full border-[0.5px] border-ai-border-chat bg-ai-surface-strong px-[5px] py-1 text-[7px] leading-[10px] font-medium whitespace-nowrap text-ai-text">
                        AI Model 1.0
                        <span className="relative block size-3 shrink-0 overflow-clip">
                          <Svg html={icons.chevron} className="absolute top-[36.46%] right-1/4 bottom-[36.46%] left-1/4 -scale-y-100" />
                        </span>
                      </span>
                      <span className={cn("relative flex size-4 items-center justify-center overflow-visible rounded-full p-[3.5px] transition-[transform,background-color] duration-100",
                        scene.pressed ? "scale-[0.78] bg-ai-purple" : "bg-ai-surface-strong")}>
                        {scene.press > 0 && (
                          <span key={scene.press} className="ai-ripple pointer-events-none absolute inset-0 rounded-full border border-ai-purple" />
                        )}
                        <span className="relative block size-2 shrink-0">
                          <span className="absolute top-1/2 left-1/2 block size-3 -translate-x-1/2 -translate-y-1/2 overflow-clip">
                            <Svg html={icons["arrow-right"]} className="absolute inset-[28.12%_20.83%]" />
                          </span>
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
