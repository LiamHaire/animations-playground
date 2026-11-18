import { useEffect, useRef, useState } from "react";
import type { ClipProps } from "../../play";
import "./notch.css";
import ICONS from "./icons.json";

// The Notch preview from the portfolio (~/portfolio/src/components/notch-frame.tsx and laptop-mockup.tsx): a laptop zoomed
// in on its top edge, where the notch springs open to show the tiles, closes, rings an alert, opens on a notification and
// closes again, on a loop. Ported as-is; only the wiring changed: it runs off the playground's runKey, speed and reduced
// props instead of prefers-reduced-motion, and its colours live in notch.css (scoped to .notch) so they don't clash with
// the playground's. Icons are the outline IQons it uses, lifted out of the portfolio's iqon-data.ts.

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const ICON_DATA: Record<string, string> = ICONS;

const LEFT_ICONS = ["Appointment", "Notifications"];
const RIGHT_ICONS = ["Microphone", "Add", "Stopwatch", "Search"];

const TILES = [
  { icon: "Mail", label: "Mail", value: "9+ unread", caption: null, bg: "#c11f70", fg: "#fdf8fa", dot: true },
  { icon: "Task", label: "Tasks", value: "3 due today", caption: null, bg: "#0f5e63", fg: "#f8fafa", dot: false },
  { icon: "Appointment", label: "Calendar", value: "15 minutes", caption: "next appointment", bg: "#6b3fa0", fg: "#fbfafd", dot: false },
];

// Loop phases: collapsed -> expand (tiles) -> collapse -> hold -> alert icon rings in and stays ->
// expand (notification) -> collapse (icon gone) -> repeat.
type Phase = "collapsed" | "tiles" | "alert" | "alertHold" | "notification";

const SEQUENCE: { phase: Phase; ms: number }[] = [
  { phase: "collapsed", ms: 1000 },
  { phase: "tiles", ms: 2600 },
  { phase: "collapsed", ms: 900 },
  { phase: "alert", ms: 900 },
  { phase: "alertHold", ms: 700 },
  { phase: "notification", ms: 2000 },
  { phase: "collapsed", ms: 1200 },
];

// Laptop geometry: drawn at 1120px wide and scaled to fit, as on the portfolio.
const SCREEN_W = 960;
const SCREEN_H = 540;
const BEZEL_X = 16;
const BEZEL_T = 16;
const BEZEL_B = 20;
const LID_W = SCREEN_W + BEZEL_X * 2;
const LID_H = SCREEN_H + BEZEL_T + BEZEL_B;
const BASE_W = 1120;
const BASE_H = 18;
const W = BASE_W;
const H = LID_H + BASE_H;

function useNotchSequence({ runKey, speed, reduced }: ClipProps) {
  const [state, setState] = useState({ step: 0, cycle: 0 });

  useEffect(() => {
    if (reduced) {
      setState({ step: 1, cycle: 0 }); // land on the tiles view, static
      return;
    }
    let i = 0;
    let cycle = 0;
    let timer: ReturnType<typeof setTimeout>;
    const advance = () => {
      setState({ step: i, cycle });
      timer = setTimeout(() => {
        i = (i + 1) % SEQUENCE.length;
        if (i === 0) cycle += 1;
        advance();
      }, SEQUENCE[i].ms / speed);
    };
    advance();
    return () => clearTimeout(timer);
  }, [runKey, speed, reduced]);

  return { phase: SEQUENCE[state.step].phase, cycle: state.cycle };
}

function Icon({ html, size = 12, className }: { html: string; size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="none"
      className={cn("shrink-0", className)} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

// cycle remounts the icon (and its sound-wave lines) once per loop, so the pop + ring CSS
// animations replay instead of silently no-op-ing on a persisted node.
function AlertIcon({ cycle }: { cycle: number }) {
  return (
    <span key={cycle} className="relative flex size-5 items-center justify-center text-notch-text">
      <svg aria-hidden className="notch-sound-line left" style={{ right: "100%", marginRight: 2 }} viewBox="0 0 12 16" width="10" height="14" fill="none">
        <path d="M10.5 5C9.6 6 9.2 6.9 9.2 8C9.2 9.1 9.6 10 10.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M6.5 1.5C4.3 3.8 3.2 5.8 3.2 8C3.2 10.2 4.3 12.2 6.5 14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <span className="notch-bell-icon">
        <Icon html={ICON_DATA.Notifications} size={20} />
      </span>
      <svg aria-hidden className="notch-sound-line right" style={{ left: "100%", marginLeft: 2 }} viewBox="0 0 12 16" width="10" height="14" fill="none">
        <path d="M1.5 5C2.4 6 2.8 6.9 2.8 8C2.8 9.1 2.4 10 1.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M5.5 1.5C7.7 3.8 8.8 5.8 8.8 8C8.8 10.2 7.7 12.2 5.5 14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function NotchHeader({ activeId }: { activeId: "Appointment" | "Notifications" | null }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {LEFT_ICONS.map((name) => (
            <span key={name}
              className={cn("flex size-8 items-center justify-center rounded-2xl transition-colors duration-200",
                activeId === name ? "bg-notch-chat-prompt text-notch-text" : "text-notch-subtle")}>
              <Icon html={ICON_DATA[name]} size={20} />
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {RIGHT_ICONS.map((name) => (
              <span key={name} className="flex size-8 items-center justify-center rounded-full text-notch-subtle">
                <Icon html={ICON_DATA[name]} size={20} />
              </span>
            ))}
          </div>
          <span className="h-7 w-px shrink-0 bg-notch-border-strong" />
          <div className="flex items-center gap-1">
            <span className="flex size-8 items-center justify-center rounded-2xl text-notch-subtle">
              <Icon html={ICON_DATA.Settings} size={20} />
            </span>
            <span className="flex size-8 items-center justify-center rounded-2xl">
              <span className="flex size-6 items-center justify-center rounded-full bg-[#0d2d30] font-notch-body text-[11px] font-semibold text-[#15c2bd]">
                LH
              </span>
            </span>
          </div>
        </div>
      </div>
      <div className="h-px w-full shrink-0 rounded-full bg-notch-border-chat" />
    </div>
  );
}

function NotchScreen(p: ClipProps) {
  const { phase, cycle } = useNotchSequence(p);
  const expanded = phase === "tiles" || phase === "notification";
  const alertVisible = phase === "alert" || phase === "alertHold";

  return (
    <div className="absolute inset-0 bg-notch-bg">
      {/* The Notch */}
      <div className={cn(
        "notch-pill-shell absolute top-0 left-1/2 -translate-x-1/2 overflow-hidden border border-t-0 border-notch-border-strong bg-notch-chat",
        expanded && "is-expanded",
        phase === "notification" && "is-notification",
      )}>
        {phase === "collapsed" && (
          <div className="flex h-full items-center justify-center">
            <span className="h-[2px] w-4 rounded-[1px] bg-notch-text" />
          </div>
        )}

        {alertVisible && (
          <div className="flex h-full items-center justify-center">
            <AlertIcon cycle={cycle} />
          </div>
        )}

        {phase === "tiles" && (
          <div className="notch-content-reveal flex h-full flex-col gap-4 p-4">
            <NotchHeader activeId="Appointment" />
            {/* Preview tiles: 200x160 in the Figma design (5:4 width:height) */}
            <div className="flex items-start gap-2">
              {TILES.map((t) => (
                <div key={t.label} className="relative flex min-w-0 flex-1 flex-col rounded-lg p-4" style={{ backgroundColor: t.bg, aspectRatio: "5 / 4" }}>
                  <div className="flex items-center gap-2" style={{ color: t.fg }}>
                    <Icon html={ICON_DATA[t.icon]} size={20} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate font-notch-body text-xs font-medium" style={{ color: t.fg }}>
                      {t.label}
                    </span>
                    {t.dot && <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: t.fg }} />}
                  </div>
                  <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <div className="relative">
                      {t.caption && (
                        <p className="absolute inset-x-0 bottom-full mb-0.5 font-notch-body text-[10px] whitespace-nowrap"
                          style={{ color: `color-mix(in srgb, ${t.fg} 70%, transparent)` }}>
                          {t.caption}
                        </p>
                      )}
                      <p className="font-display text-xl font-bold" style={{ color: t.fg }}>
                        {t.value}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === "notification" && (
          <div className="notch-content-reveal flex h-full flex-col gap-4 p-4">
            <NotchHeader activeId="Notifications" />
            {/* New notification row */}
            <div className="flex h-[58px] items-center gap-2 rounded border border-notch-border-chat bg-notch-chat-prompt/50 px-3 py-2">
              <span className="size-2 shrink-0 rounded-full bg-[#ef4444]" />
              <span className="flex shrink-0 items-center justify-center rounded border border-notch-border-chat p-1">
                <Icon html={ICON_DATA.IconInfoSquare} size={20} className="text-notch-text" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate font-notch-body text-sm font-medium text-notch-text">New notification title</p>
                <p className="truncate font-notch-body text-sm text-notch-subtle">
                  This subtitle gives a preview of the notification content for consideration so the user can respond
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LaptopMockup({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="notch-laptop relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
      <div aria-hidden className="pointer-events-none absolute inset-x-[2%] -bottom-[2.5%] h-[5%] rounded-[50%]"
        style={{ background: "color-mix(in srgb, var(--color-ink-950) 55%, transparent)", filter: "blur(10px)" }} />
      <div className={cn("absolute top-0 left-0 origin-top-left", scale === null && "invisible")}
        style={{ width: W, height: H, transform: `scale(${scale ?? 1})` }}>
        {/* Lid */}
        <div className="absolute top-0 rounded-t-[28px] border-[1.5px] border-b-0"
          style={{ left: (W - LID_W) / 2, width: LID_W, height: LID_H, backgroundColor: "var(--ip-body)", borderColor: "var(--ip-edge)" }} />
        <div className="absolute top-[4px] rounded-t-[24px]"
          style={{ left: (W - LID_W) / 2 + 4, width: LID_W - 8, height: LID_H - 4, backgroundColor: "var(--ip-bezel)" }} />
        <div className="absolute overflow-hidden rounded-[8px] bg-notch-bg"
          style={{ left: (W - LID_W) / 2 + BEZEL_X, top: BEZEL_T, width: SCREEN_W, height: SCREEN_H }}>
          {children}
        </div>

        {/* Base */}
        <div className="absolute overflow-hidden rounded-b-[18px] border-t-[1.5px]"
          style={{ left: 0, top: LID_H, width: BASE_W, height: BASE_H, backgroundColor: "var(--ip-deck)", borderColor: "var(--ip-edge)" }}>
          <div className="absolute inset-0"
            style={{ backgroundColor: "var(--ip-deck-shade)", maskImage: "linear-gradient(to bottom, transparent, black)", WebkitMaskImage: "linear-gradient(to bottom, transparent, black)" }} />
          <div className="absolute top-0 left-1/2 h-[6px] w-[140px] -translate-x-1/2 rounded-b-[8px]" style={{ backgroundColor: "var(--ip-notch)" }} />
        </div>
      </div>
    </div>
  );
}

export function Notch(p: ClipProps) {
  return (
    <div className={cn("notch absolute inset-0 flex items-center justify-center overflow-hidden", p.reduced && "is-reduced")}
      style={{ "--notch-speed": p.speed } as React.CSSProperties}
      role="img" aria-label="The Notch: a laptop's notch opening to show tiles, then a notification">
      {/* The portfolio's 16:9 card, letterboxed into the other aspects. */}
      <div className="relative aspect-video max-h-full w-full overflow-hidden">
        {/* Laptop screen, zoomed in on the top edge so the notch reads clearly, with enough
            vertical room reserved below it for the expanded panel. */}
        <div className="absolute inset-x-0 top-0" style={{ transform: "translateY(18%) scale(1.25)", transformOrigin: "top" }}>
          <LaptopMockup>
            <NotchScreen {...p} />
          </LaptopMockup>
        </div>
      </div>
    </div>
  );
}
