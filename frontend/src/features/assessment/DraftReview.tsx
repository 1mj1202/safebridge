// 위험성평가 초안 검토·수정·승인 — 각 항목에 근거(사례·부재·영역·조문·예보) 표시
import { useEffect, useState } from "react";
import { Button, Chip, LevelBadge, Panel } from "../../shared/ui";
import type { Assessment, DraftItem, Level } from "../../shared/types";
import EvidenceModal, { type Evidence } from "./EvidenceModal";

interface Props {
  a: Assessment;
  busy: boolean;
  onSave: (items: DraftItem[], summary: string, notes: string[]) => void;
  onApprove: () => void;
  onFocusZones: (ids: string[]) => void;
}

export default function DraftReview({ a, busy, onSave, onApprove, onFocusZones }: Props) {
  const d = a.draft;
  const [items, setItems] = useState(d.items);
  const [summary, setSummary] = useState(d.summary);
  const [notes, setNotes] = useState(d.notes.join("\n"));
  const [ev, setEv] = useState<Evidence | null>(null);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setItems(d.items); setSummary(d.summary); setNotes(d.notes.join("\n")); setDirty(false); }, [d]);
  const locked = a.status === "approved";
  const upd = (id: string, patch: Partial<DraftItem>) => {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setDirty(true);
  };

  return (
    <Panel title={<>위험성평가 초안 <span className="font-normal text-slate-500">· {d.date} {d.storey}</span></>}
      right={locked ? <Chip tone="blue">승인됨</Chip> : <Chip tone="amber">검토 중</Chip>}>
      {d.data_note && <p className="mb-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">{d.data_note}</p>}
      {d.llm_note && <p className="mb-2 rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{d.llm_note}</p>}
      <textarea className="w-full rounded-lg border border-slate-200 p-2 text-sm" rows={2} value={summary}
        disabled={locked} aria-label="요약" onChange={(e) => { setSummary(e.target.value); setDirty(true); }} />

      <ul className="mt-3 space-y-3">
        {items.map((it) => {
          const off = it.included === false;
          return (
            <li key={it.id} className={`rounded-lg border p-3 ${off ? "border-dashed opacity-50" : "border-slate-200"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <input type="checkbox" checked={!off} disabled={locked} aria-label={`${it.hazard} 포함`}
                  onChange={(e) => upd(it.id, { included: e.target.checked })} />
                <b className="text-sm">{it.id}. {it.hazard}</b>
                {locked ? <LevelBadge level={it.level} /> : (
                  <select value={it.level} className="rounded border text-xs" aria-label="위험도"
                    onChange={(e) => upd(it.id, { level: e.target.value as Level })}>
                    {(["상", "중", "하"] as Level[]).map((l) => <option key={l}>{l}</option>)}
                  </select>
                )}
                {it.frequency && <span className="text-xs text-slate-500">사망사고 사례 {it.frequency.count}/{it.frequency.of}건</span>}
                {it.evidence_status === "확인 불가" && <Chip tone="red">근거 확인 불가</Chip>}
              </div>
              <p className="mt-1 text-xs text-slate-500">📍 {it.location}</p>
              <textarea className="mt-2 w-full rounded border border-slate-200 p-2 text-sm" rows={2} disabled={locked}
                value={it.explanation} aria-label="설명" onChange={(e) => upd(it.id, { explanation: e.target.value })} />
              {it.measures.length > 0 && (
                <textarea className="mt-1 w-full rounded border border-slate-200 p-2 text-sm" disabled={locked}
                  rows={Math.max(2, it.measures.length)} value={it.measures.join("\n")} aria-label="대책"
                  onChange={(e) => upd(it.id, { measures: e.target.value.split("\n") })} />
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                {it.evidence.cases.map((c) => <Chip key={c} tone="amber" onClick={() => setEv({ kind: "case", id: c })}>사례 {c}</Chip>)}
                {it.evidence.laws.map((l) => <Chip key={l} tone="blue" onClick={() => setEv({ kind: "law", id: l })}>
                  {d.laws.find((x) => x.id === l)?.article ?? l}</Chip>)}
                {it.evidence.zones.length > 0 && (
                  <Chip tone="red" onClick={() => onFocusZones(it.evidence.zones)}>3D 영역 {it.evidence.zones.length}곳</Chip>
                )}
                {it.evidence.elements.slice(0, 3).map((e) => <Chip key={e}>부재 {e}</Chip>)}
                {it.evidence.forecast && <Chip>예보 풍속 {it.evidence.forecast.wind_gust}m/s</Chip>}
                {it.profile && (
                  <Chip tone="red" onClick={() => setEv({ kind: "profile", id: it.profile!.id })}>
                    위험요소 프로파일 가능성 {it.profile.likelihood} · 심각성 {it.profile.severity}</Chip>
                )}
                {(it.evidence.guides ?? []).map((g) => <Chip key={g} tone="blue" onClick={() => setEv({ kind: "guide", id: g })}>KOSHA {g}</Chip>)}
              </div>
              {it.stat && (
                <p className="mt-1 text-xs text-slate-500">
                  통계: {it.stat.trade} 사고 {it.stat.total.toLocaleString()}건 중 {it.stat.weather} 때 {it.stat.count}건
                  (사망 {it.stat.fatal}건) · {it.stat.source}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {d.sources && (
        <p className="mt-3 text-xs text-slate-400">
          근거 데이터: {d.sources.cases}; {d.sources.profile}.
          사망사고가 가장 많은 시간대는 {d.sources.hourly.peak.join(", ")}예요({d.sources.hourly.source}).
        </p>
      )}

      <label className="mt-3 block text-xs font-bold text-slate-500">시공 유의사항</label>
      <textarea className="w-full rounded-lg border border-slate-200 p-2 text-sm" rows={3} value={notes} disabled={locked}
        aria-label="시공 유의사항" onChange={(e) => { setNotes(e.target.value); setDirty(true); }} />

      {!locked && (
        <div className="mt-3 flex justify-end gap-2">
          <Button kind="ghost" disabled={!dirty || busy}
            onClick={() => { onSave(items, summary, notes.split("\n").filter(Boolean)); setDirty(false); }}>수정 저장</Button>
          <Button kind="danger" disabled={dirty || busy} onClick={onApprove}>검토 완료 · 승인</Button>
        </div>
      )}
      {!locked && dirty && <p className="mt-1 text-right text-xs text-slate-400">수정 내용을 저장한 뒤 승인할 수 있어요</p>}
      {ev && <EvidenceModal ev={ev} onClose={() => setEv(null)} />}
    </Panel>
  );
}
