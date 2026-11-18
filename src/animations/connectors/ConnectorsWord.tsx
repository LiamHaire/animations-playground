import type { ClipProps } from "../../play";
import { PopLetters } from "../../clips/PopText";
import { RollText } from "../../clips/RollText";

const WORD = "CONNECTORS";

type ConnectorsWordProps = ClipProps & {
  rollAt: number;
  popAt: number;
  fontSize: string;
};

export function ConnectorsWord({ rollAt, popAt, fontSize, ...clip }: ConnectorsWordProps) {
  return (
    <div style={{ gridArea: "1 / 1", filter: "drop-shadow(0 0.208cqw 0.208cqw rgb(10 10 10 / 0.25))" }}>
      <RollText {...clip} text={WORD} startDelay={rollAt} className="leading-none font-black tracking-[0.15em]" style={{ fontSize }}>
        <PopLetters {...clip} text={WORD} popAt={popAt} fontSize={fontSize} gradient="var(--connectors-gradient)" />
      </RollText>
    </div>
  );
}
