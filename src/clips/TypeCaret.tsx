import type { ClipProps } from "../play";
import { TypeText } from "./TypeText";

export function TypeCaret(props: ClipProps) {
  return (
    <TypeText
      {...props}
      text="Hello"
      startDelay={300}
      className="text-[9cqw] leading-none font-medium text-foreground"
    />
  );
}
