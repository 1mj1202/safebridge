// 평가 항목 근거 태그(사례·조문·3D 영역·부재·예보·프로파일·KOSHA) — 기본은 접어 두고 '근거 보기'로 펼침
import { Chip } from "../../shared/ui";
import type { Assessment, DraftItem } from "../../shared/types";
import type { Evidence } from "./EvidenceModal";

interface Props {
  it: DraftItem;
  laws: Assessment["draft"]["laws"];
  onEvidence: (ev: Evidence) => void;
  onFocusZones: (ids: string[]) => void;
}

export default function EvidenceChips({ it, laws, onEvidence, onFocusZones }: Props) {
  const e = it.evidence;
  return (
    <details className="mt-1 text-xs text-slate-500">
      <summary className="cursor-pointer select-none">근거 보기</summary>
      <div className="mt-1 flex flex-wrap gap-1">
        {e.cases.map((c) => <Chip key={c} tone="amber" onClick={() => onEvidence({ kind: "case", id: c })}>사례 {c}</Chip>)}
        {e.laws.map((l) => <Chip key={l} tone="blue" onClick={() => onEvidence({ kind: "law", id: l })}>
          {laws.find((x) => x.id === l)?.article ?? l}</Chip>)}
        {e.zones.length > 0 && (
          <Chip tone="red" onClick={() => onFocusZones(e.zones)}>3D 영역 {e.zones.length}곳</Chip>
        )}
        {e.elements.slice(0, 3).map((el) => <Chip key={el}>부재 {el}</Chip>)}
        {e.forecast && <Chip>예보 풍속 {e.forecast.wind_gust}m/s</Chip>}
        {it.profile && (
          <Chip tone="red" onClick={() => onEvidence({ kind: "profile", id: it.profile!.id })}>
            위험요소 프로파일 가능성 {it.profile.likelihood} · 심각성 {it.profile.severity}</Chip>
        )}
        {(e.guides ?? []).map((g) => <Chip key={g} tone="blue" onClick={() => onEvidence({ kind: "guide", id: g })}>KOSHA {g}</Chip>)}
      </div>
    </details>
  );
}
