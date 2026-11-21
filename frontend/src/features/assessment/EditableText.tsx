// 평소엔 글로 보여 주고, 수정할 때만 입력칸으로 바꾸는 글 상자
// list: 줄마다 한 항목(대책 목록처럼)으로 보여 준다
import { Pencil } from "lucide-react";
import { useState } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  label: string;
  /** 승인됨·날짜 잠금 등 수정 불가 */
  locked?: boolean;
  /** 바깥에서 수정 모드를 정할 때 (항목 카드의 '수정' 버튼). 안 주면 자체 연필 버튼으로 전환 */
  editing?: boolean;
  list?: boolean;
  rows?: number;
  className?: string;
}

export default function EditableText({ value, onChange, label, locked = false, editing, list = false, rows = 2, className = "" }: Props) {
  const [own, setOwn] = useState(false);
  const controlled = editing !== undefined;
  const on = !locked && (controlled ? editing : own);

  if (on) {
    return (
      <textarea className={`w-full rounded border border-slate-300 p-2 text-sm ${className}`} rows={rows} value={value}
        aria-label={label} autoFocus={!controlled} onChange={(e) => onChange(e.target.value)}
        onBlur={controlled ? undefined : () => setOwn(false)} />
    );
  }
  const lines = value.split("\n").filter((l) => l.trim());
  return (
    <div className={`group relative text-sm text-slate-800 ${className}`} aria-label={label}>
      {list ? (
        <ul className="list-disc space-y-0.5 pl-5">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
      ) : (
        <p className="whitespace-pre-line">{value || <span className="text-slate-400">(비어 있음)</span>}</p>
      )}
      {!locked && !controlled && (
        <button type="button" onClick={() => setOwn(true)} aria-label={`${label} 수정`}
          className="absolute right-0 top-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <Pencil size={13} />
        </button>
      )}
    </div>
  );
}
