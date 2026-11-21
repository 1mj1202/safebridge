// 평가 항목 근거를 종류별로 따로 접어 둔다: 관련 사례 / 근거 조문 / 기타 근거(3D 영역·부재·예보·프로파일·KOSHA)
// 버튼 하나를 누르면 그 종류만 펼친다
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Chip } from "../../shared/ui";
import type { Assessment, DraftItem } from "../../shared/types";
import type { Evidence } from "./EvidenceModal";

interface Props {
  it: DraftItem;
  laws: Assessment["draft"]["laws"];
  onEvidence: (ev: Evidence) => void;
  onFocusZones: (ids: string[]) => void;
}

type Kind = "cases" | "laws" | "other";

export default function EvidenceFolds({ it, laws, onEvidence, onFocusZones }: Props) {
  const [open, setOpen] = useState<Kind | null>(null);
  const e = it.evidence;
  const guides = e.guides ?? [];
  const otherCount = (e.zones.length ? 1 : 0) + Math.min(e.elements.length, 3) + (e.forecast ? 1 : 0)
    + (it.profile ? 1 : 0) + guides.length;

  const folds: { kind: Kind; label: string; n: number; body: ReactNode }[] = [
    { kind: "cases", label: "관련 사례", n: e.cases.length, body: (
      e.cases.map((c) => <Chip key={c} tone="amber" onClick={() => onEvidence({ kind: "case", id: c })}>사례 {c}</Chip>)
    ) },
    { kind: "laws", label: "근거 조문", n: e.laws.length, body: (
      e.laws.map((l) => <Chip key={l} tone="blue" onClick={() => onEvidence({ kind: "law", id: l })}>
        {laws.find((x) => x.id === l)?.article ?? l}</Chip>)
    ) },
    { kind: "other", label: "기타 근거", n: otherCount, body: (<>
      {e.zones.length > 0 && <Chip tone="red" onClick={() => onFocusZones(e.zones)}>3D 영역 {e.zones.length}곳</Chip>}
      {e.elements.slice(0, 3).map((el) => <Chip key={el}>부재 {el}</Chip>)}
      {e.forecast && <Chip>예보 풍속 {e.forecast.wind_gust}m/s</Chip>}
      {it.profile && (
        <Chip tone="red" onClick={() => onEvidence({ kind: "profile", id: it.profile!.id })}>
          위험요소 프로파일 가능성 {it.profile.likelihood} · 심각성 {it.profile.severity}</Chip>
      )}
      {guides.map((g) => <Chip key={g} tone="blue" onClick={() => onEvidence({ kind: "guide", id: g })}>KOSHA {g}</Chip>)}
    </>) },
  ];
  const shown = folds.filter((f) => f.n > 0);
  if (!shown.length) return null;
  const cur = shown.find((f) => f.kind === open);

  return (
    <div className="mt-1 text-xs text-slate-500">
      <div className="flex flex-wrap gap-3">
        {shown.map((f) => (
          <button key={f.kind} type="button" aria-expanded={open === f.kind}
            onClick={() => setOpen(open === f.kind ? null : f.kind)}
            className={`flex items-center gap-0.5 select-none hover:text-slate-800 ${open === f.kind ? "font-semibold text-slate-800" : ""}`}>
            {open === f.kind ? <ChevronDown size={12} /> : <ChevronRight size={12} />}{f.label} {f.n}
          </button>
        ))}
      </div>
      {cur && <div className="mt-1 flex flex-wrap gap-1">{cur.body}</div>}
    </div>
  );
}
