// 위험성평가 초안 검토·수정·승인 — 항목은 DraftItemCard, 버튼 줄은 DraftActions(아래쪽 고정)
import { useEffect, useState } from "react";
import { Chip, Panel } from "../../shared/ui";
import type { Assessment, DraftItem } from "../../shared/types";
import { useStaff } from "../../shared/staff";
import DraftActions from "./DraftActions";
import DraftItemCard from "./DraftItemCard";
import EditableText from "./EditableText";
import EvidenceModal, { type Evidence } from "./EvidenceModal";

interface Props {
  a: Assessment;
  busy: boolean;
  onSave: (items: DraftItem[], summary: string, notes: string[]) => void;
  onApprove: () => void;
  onFocusZones: (ids: string[]) => void;
  /** 보고 있는 날짜와 초안 작업일이 다르면 true — 수정·승인 잠금 */
  frozen?: boolean;
}

export default function DraftReview({ a, busy, onSave, onApprove, onFocusZones, frozen = false }: Props) {
  const d = a.draft;
  const [items, setItems] = useState(d.items);
  const [summary, setSummary] = useState(d.summary);
  const [notes, setNotes] = useState(d.notes.join("\n"));
  const [ev, setEv] = useState<Evidence | null>(null);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setItems(d.items); setSummary(d.summary); setNotes(d.notes.join("\n")); setDirty(false); }, [d]);
  const approved = a.status === "approved";
  const { can } = useStaff();
  const closed = approved || frozen;
  const locked = closed || !can("edit"); // 현장소장·발주처는 내용 수정 불가
  const upd = (id: string, patch: Partial<DraftItem>) => {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setDirty(true);
  };

  return (
    <Panel title={<>위험성평가 초안 <span className="font-normal text-slate-500">· {d.date} {d.storey}</span></>}
      right={approved ? <Chip tone="blue">승인됨</Chip> : <Chip tone="amber">검토 중</Chip>}>
      {d.data_note && <p className="mb-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">{d.data_note}</p>}
      {d.llm_note && <p className="mb-2 rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{d.llm_note}</p>}
      <EditableText label="요약" locked={locked} value={summary} className="pr-6"
        onChange={(v) => { setSummary(v); setDirty(true); }} />

      <ul className="mt-3 space-y-3">
        {items.map((it) => (
          <DraftItemCard key={it.id} it={it} laws={d.laws} locked={locked} onChange={(p) => upd(it.id, p)}
            onEvidence={setEv} onFocusZones={onFocusZones} />
        ))}
      </ul>

      {d.sources && (
        <p className="mt-3 text-xs text-slate-400">
          근거 데이터: {d.sources.cases}; {d.sources.profile}.
          사망사고가 가장 많은 시간대는 {d.sources.hourly.peak.join(", ")}예요({d.sources.hourly.source}).
        </p>
      )}

      <div className="mt-3 text-xs font-bold text-slate-500">시공 유의사항</div>
      <EditableText list label="시공 유의사항" locked={locked} rows={3} value={notes} className="pr-6"
        onChange={(v) => { setNotes(v); setDirty(true); }} />

      {!closed && (can("edit") || can("approve")) && (
        <DraftActions dirty={dirty} busy={busy} onApprove={onApprove} canEdit={can("edit")} canApprove={can("approve")}
          onSave={() => { onSave(items, summary, notes.split("\n").filter(Boolean)); setDirty(false); }} />
      )}
      {ev && <EvidenceModal ev={ev} onClose={() => setEv(null)} />}
    </Panel>
  );
}
