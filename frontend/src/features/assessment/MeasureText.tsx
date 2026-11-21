// 대책 한 줄을 개조식으로 보여 준다. 미리 줄여 둔 짧은 문구가 있으면 그것을, 없으면
// 조건(~경우/~시)은 작고 흐리게·조치는 굵게 나눠 보여 준다. 마우스를 올리면 원문.
import { splitMeasure } from "./measureText";

export default function MeasureText({ text, short }: { text: string; short?: string }) {
  if (short) return <span title={text} className="text-slate-900">{short}</span>;
  const { cond, action } = splitMeasure(text);
  return (
    <span title={text}>
      {cond && <span className="mr-1 text-xs text-slate-500">{cond}</span>}
      <span className="text-slate-900">{action}</span>
    </span>
  );
}
