// 위험성평가 초안 항목 하나: 순위·위험도·위치·설명·오늘 대책·근거. '수정'을 눌렀을 때만 입력칸(대책은 후보 체크 목록)으로 바뀐다
import { Check, MapPin, Pencil } from "lucide-react";
import { useState } from "react";
import { Chip, LevelBadge } from "../../shared/ui";
import type { Assessment, DraftItem, Level } from "../../shared/types";
import BasisTag from "../admin/BasisTag";
import LegalNote from "../admin/LegalNote";
import EditableText from "./EditableText";
import EvidenceChips from "./EvidenceChips";
import type { Evidence } from "./EvidenceModal";
import MeasurePicker from "./MeasurePicker";
import ReferenceMeasures from "./ReferenceMeasures";

interface Props {
  it: DraftItem;
  laws: Assessment["draft"]["laws"];
  locked: boolean;
  onChange: (patch: Partial<DraftItem>) => void;
  onEvidence: (e: Evidence) => void;
  onFocusZones: (ids: string[]) => void;
}

export default function DraftItemCard({ it, laws, locked, onChange, onEvidence, onFocusZones }: Props) {
  const [editing, setEditing] = useState(false);
  const off = it.included === false;
  const edit = editing && !locked;

  return (
    <li className={`rounded-lg border p-3 ${off ? "border-dashed opacity-50" : edit ? "border-slate-400" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <input type="checkbox" checked={!off} disabled={locked} aria-label={`${it.hazard} 포함`}
          onChange={(e) => onChange({ included: e.target.checked })} />
        {it.risk_rank && <span className={`rounded px-1.5 text-xs font-bold ${it.top ? "bg-slate-900 text-white" : "bg-slate-200"}`}>
          {it.risk_rank}순위</span>}
        <b className="text-sm">{it.id}. {it.hazard}</b>
        {it.rank_basis && (
          <span className="text-xs text-slate-600" title={`R = P ${it.rank_basis.p_raw} × S ${it.rank_basis.s_raw} × w ${it.rank_basis.w} + 기상 ${it.rank_basis.weather}`}>
            {it.rank_basis.p}×{it.rank_basis.s}{it.rank_basis.weather ? " · 강풍 +" + it.rank_basis.weather : ""}
          </span>
        )}
        {edit ? (
          <select value={it.level} className="rounded border text-xs" aria-label="위험도"
            onChange={(e) => onChange({ level: e.target.value as Level })}>
            {(["상", "중", "하"] as Level[]).map((l) => <option key={l}>{l}</option>)}
          </select>
        ) : <LevelBadge level={it.level} />}
        {it.frequency && <span className="text-xs text-slate-500">유사 사고사례 {it.frequency.count}/{it.frequency.of}건</span>}
        {it.evidence_status === "확인 불가" && <Chip tone="red">근거 확인 불가</Chip>}
        {!locked && (
          <button type="button" onClick={() => setEditing(!editing)} aria-pressed={edit}
            className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800">
            {edit ? <><Check size={12} />완료</> : <><Pencil size={12} />수정</>}
          </button>
        )}
      </div>
      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin size={12} />{it.location}</p>
      {it.weather?.basis && (
        <div className="mt-0.5 text-xs text-slate-500"><BasisTag basis={it.weather.basis} /><LegalNote text={it.weather.legal} /></div>
      )}
      <EditableText className="mt-2" label="설명" editing={edit} locked={locked} value={it.explanation}
        onChange={(v) => onChange({ explanation: v })} />
      {(edit || it.measures.length > 0 || (it.measure_options?.length ?? 0) > 0) && (<>
        <div className="mt-2 text-xs font-bold text-slate-500">오늘 적용할 대책</div>
        <MeasurePicker it={it} editing={edit} onChange={(measures) => onChange({ measures })} />
      </>)}
      {(it.reference_measures?.length ?? 0) > 0 && (
        <ReferenceMeasures refs={it.reference_measures!} onCase={(id) => onEvidence({ kind: "case", id })} />
      )}
      <EvidenceChips it={it} laws={laws} onEvidence={onEvidence} onFocusZones={onFocusZones} />
      {it.stat && (
        <p className="mt-1 text-xs text-slate-500">
          통계: {it.stat.trade} 사고 {it.stat.total.toLocaleString()}건 중 {it.stat.weather} 때 {it.stat.count}건
          (사망 {it.stat.fatal}건) · {it.stat.source}
        </p>
      )}
    </li>
  );
}
