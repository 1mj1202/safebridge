// 오늘 적용할 대책: 평소엔 목록으로 보여 주고, '수정'일 때는 후보 목록에서 체크로 고른다
// 후보 = 오늘 조건에 맞는 유사사례 대책 + 지금 들어간 대책 + 조건이 다른 참고 대책(표시) + 직접 추가
import { Plus } from "lucide-react";
import { useState } from "react";
import type { DraftItem } from "../../shared/types";

interface Props {
  it: DraftItem;
  editing: boolean;
  onChange: (measures: string[]) => void;
}

interface Option { text: string; ref?: string }

export function measureOptions(it: DraftItem): Option[] {
  const out: Option[] = [];
  const seen = new Set<string>();
  const add = (text: string, ref?: string) => {
    const t = text.trim();
    if (t && !seen.has(t)) { seen.add(t); out.push({ text: t, ref }); }
  };
  it.measures.forEach((m) => add(m));
  (it.measure_options ?? []).forEach((m) => add(m));
  (it.reference_measures ?? []).forEach((r) => add(r.text, r.reason));
  return out;
}

export default function MeasurePicker({ it, editing, onChange }: Props) {
  const [custom, setCustom] = useState("");
  const chosen = it.measures.map((m) => m.trim()).filter(Boolean);
  const opts = measureOptions(it);

  if (!editing) {
    if (!chosen.length) return <p className="text-sm text-slate-400">(선택된 대책 없음)</p>;
    return <ul className="list-disc space-y-0.5 pl-5 text-sm text-slate-800">{chosen.map((m) => <li key={m}>{m}</li>)}</ul>;
  }

  // 체크 순서는 후보 목록 순서를 따른다 (직접 추가한 것은 후보 목록에도 들어 있다)
  const toggle = (t: string, on: boolean) => {
    const next = new Set(chosen);
    if (on) next.add(t); else next.delete(t);
    onChange(opts.map((o) => o.text).filter((x) => next.has(x)));
  };
  const addCustom = () => {
    const t = custom.trim();
    if (!t) return;
    if (!chosen.includes(t)) onChange([...chosen, t]);
    setCustom("");
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
              <span className={o.ref && !chosen.includes(o.text) ? "text-slate-500" : "text-slate-800"}>
                {o.ref && <span className="mr-1 rounded bg-slate-200 px-1 text-xs text-slate-600">참고 · {o.ref}</span>}
                {o.text}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-1">
        <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="목록에 없는 대책 직접 추가"
          aria-label="대책 직접 추가" className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); addCustom(); } }} />
        <button type="button" onClick={addCustom} disabled={!custom.trim()}
          className="flex items-center gap-1 rounded border border-slate-300 px-2 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-40">
          <Plus size={12} />추가
        </button>
      </div>
    </div>
  );
}
