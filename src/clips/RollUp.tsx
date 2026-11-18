import type { ClipProps } from "../play";
import { RollText } from "./RollText";

const CLASS = "text-[6.5cqw] leading-none font-medium tracking-tight";

export function RollUp(props: ClipProps) {
  return (
    <div className="grid place-items-center">
      <RollText {...props} text="design systems" startDelay={300} outAt={1700} className={CLASS} style={{ color: "var(--stage-fg)" }} />
      <RollText {...props} text="AI-driven design" startDelay={1700} className={CLASS} style={{ color: "var(--color-brand)" }} />
    </div>
  );
}
