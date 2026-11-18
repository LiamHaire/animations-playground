import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { type ClipProps, play } from "../../play";
const SRC = "/connectors/icons";

function Layer({ name, inset = "0" }: { name: string; inset?: string }) {
  return (
    <span className="absolute" style={{ inset }}>
      <img alt="" src={`${SRC}/${name}.svg`} className="block size-full max-w-none" />
    </span>
  );
}

function Fill({ inset, rounded }: { inset: string; rounded?: boolean }) {
  return (
    <span
      className="absolute"
      style={{
        inset,
        background: "var(--connectors-icon-fill)",
        borderRadius: rounded ? "0 0 calc(var(--icon) * 0.025) calc(var(--icon) * 0.025)" : undefined,
      }}
    />
  );
}

const ICONS: { name: string; node: ReactNode }[] = [
  { name: "generic", node: <Layer name="generic" /> },
  { name: "performance-talent", node: <Layer name="performance-talent" /> },
  { name: "identity", node: <Layer name="identity" /> },
  { name: "task-manager", node: <Layer name="task-manager" /> },
  {
    name: "data-insights",
    node: (
      <>
        <Fill inset="46.88% 60.42% 15.63% 18.75%" />
        <Fill inset="34.38% 18.75% 15.63% 60.42%" />
        <Layer name="data-insights-stroke" inset="12.5%" />
      </>
    ),
  },
  {
    name: "flow",
    node: (
      <>
        <Layer name="flow-fill" inset="8.33%" />
        <Layer name="flow-stroke" inset="8.33%" />
      </>
    ),
  },
  { name: "automations", node: <Layer name="automations" /> },
  { name: "mail", node: <Layer name="mail" /> },
  {
    name: "calendar",
    node: (
      <>
        <Fill inset="41.67% 8.33% 8.33% 8.33%" rounded />
        <Layer name="calendar-stroke" inset="8.33%" />
      </>
    ),
  },
];

export const ICON_POP_MS = 440;

const POP_IN: Keyframe[] = [
  { opacity: 0, transform: "translateY(14%) scale(0.35) rotate(-10deg)", offset: 0 },
  { opacity: 1, transform: "translateY(-3%) scale(1.12) rotate(2deg)", offset: 0.6 },
  { opacity: 1, transform: "translateY(0) scale(1) rotate(0deg)", offset: 1 },
];

type ConnectorIconsProps = ClipProps & {
  size: string;
  // Time (ms) each icon should appear, by index, so the caller can sync them to the letters popping.
  appearAt: (index: number, count: number) => number;
};

export function ConnectorIcons({ runKey, speed, reduced, size, appearAt }: ConnectorIconsProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const icons = [...root.current!.querySelectorAll<HTMLElement>("[data-icon]")];
    const anims: Animation[] = [];
    icons.forEach((el, i) => {
      const delay = appearAt(i, icons.length);
      if (reduced) play(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay, easing: "ease" }, speed, anims);
      else play(el, POP_IN, { duration: ICON_POP_MS, delay, easing: "ease-out" }, speed, anims);
    });
    return () => anims.forEach((a) => a.cancel());
  }, [runKey, speed, reduced, appearAt]);

  return (
    <div
      ref={root}
      aria-hidden
      className="flex items-center"
      style={{ gridArea: "1 / 1", gap: `calc(${size} * 0.15)`, "--icon": size } as CSSProperties}
    >
      {ICONS.map(({ name, node }) => (
        <div key={name} data-icon className="relative shrink-0 opacity-0" style={{ width: "var(--icon)", height: "var(--icon)" }}>
          {node}
        </div>
      ))}
    </div>
  );
}
