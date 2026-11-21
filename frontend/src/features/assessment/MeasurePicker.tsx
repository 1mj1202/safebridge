// 오늘 적용할 대책: 평소엔 목록 + 직접 추가 칸, '수정'일 때는 후보 목록에서 체크로 고른다
// 후보 = 지금 들어간 대책 + 오늘 조건에 맞는 유사사례 대책 + 직접 추가 (조건이 다른 참고 대책은 ReferenceMeasures에 따로 접어 둔다)
import MeasureAdd from "./MeasureAdd";
import MeasureText from "./MeasureText";
import type { DraftItem } from "../../shared/types";

interface Props {
  it: DraftItem;
  editing: boolean;
  /** 승인됨·날짜 잠금이면 직접 추가 칸도 숨긴다 */
  locked?: boolean;
  onChange: (measures: string[]) => void;
}

interface Option { text: string }

export function measureOptions(it: DraftItem): Option[] {
  const out: Option[] = [];
  const seen = new Set<string>();
  const add = (text: string) => {
    const t = text.trim();
    if (t && !seen.has(t)) { seen.add(t); out.push({ text: t }); }
  };
  it.measures.forEach((m) => add(m));
  (it.measure_options ?? []).forEach((m) => add(m));
  return out;
}

export default function MeasurePicker({ it, editing, locked = false, onChange }: Props) {
  const chosen = it.measures.map((m) => m.trim()).filter(Boolean);
  const opts = measureOptions(it);
  const addCustom = (t: string) => { if (!chosen.includes(t)) onChange([...chosen, t]); };

  if (!editing) {
    return (
      <>
        {chosen.length
          ? <ul className="list-disc space-y-0.5 pl-5 text-sm text-slate-800">{chosen.map((m) => <li key={m}><MeasureText text={m} short={it.measure_short?.[m]} /></li>)}</ul>
          : <p className="text-sm text-slate-400">(선택된 대책 없음)</p>}
        {!locked && <MeasureAdd onAdd={addCustom} />}
      </>
    );
  }

  // 체크 순서는 후보 목록 순서를 따른다 (직접 추가한 것은 후보 목록에도 들어 있다)
  const toggle = (t: string, on: boolean) => {
    const next = new Set(chosen);
    if (on) next.add(t); else next.delete(t);
    onChange(opts.map((o) => o.text).filter((x) => next.has(x)));
  };

  return (
    <div className="rounded border border-slate-300 p-2" role="group" aria-label="오늘 적용할 대책 선택">
      <p className="mb-1 text-xs text-slate-500">적용할 대책을 체크하세요 · {chosen.length}개 선택</p>
      <ul className="space-y-1">
        {opts.map((o) => (
          <li key={o.text}>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={chosen.includes(o.text)}
                onChange={(e) => toggle(o.text, e.target.checked)} />
              <MeasureText text={o.text} short={it.measure_short?.[o.text]} />
            </label>
          </li>
        ))}
      </ul>
      <MeasureAdd onAdd={addCustom} />
    </div>
  );
}
