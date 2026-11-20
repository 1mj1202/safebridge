// 현장 이슈함 — 근로자가 모국어로 보낸 문제(한국어 번역·요약·긴급도·전달 대상) → 한국어로 회신하면 근로자 언어로 번역
import { useState } from "react";
import { api } from "../../shared/api";
import { useFetch, usePoll } from "../../shared/hooks";
import { Button, Chip, Panel } from "../../shared/ui";
import type { FieldIssue, Meta } from "../../shared/types";

function IssueRow({ it, meta, onDone }: { it: FieldIssue; meta: Meta; onDone: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try { await api.post(`/issues/${it.id}/answer`, { text_ko: text.trim() }); setText(""); onDone(); } finally { setBusy(false); }
  };
  const urgent = it.urgency === "urgent";
  return (
    <li className={`rounded-lg p-2 text-sm ${urgent && it.status === "open" ? "bg-red-50 ring-2 ring-red-400" : "bg-slate-50"}`}>
      <div className="flex flex-wrap items-center gap-1">
        {urgent ? <Chip tone="red">긴급</Chip> : it.safety ? <Chip tone="amber">안전</Chip> : <Chip>일반</Chip>}
        <b>{it.summary_ko || it.text_ko}</b>
        <span className="ml-auto text-xs text-slate-500">{it.zone || "구역 미지정"} · {meta.langs[it.lang] ?? it.lang}</span>
      </div>
      {it.text_ko && it.text_ko !== it.summary_ko && <p className="mt-1">{it.text_ko}</p>}
      {it.lang !== "ko" && <p className="text-xs text-slate-500">원문: {it.text_original}{!it.translated && " (번역 안 됨)"}</p>}
      <p className="mt-1 text-xs text-slate-500">전달: {it.route.join(" → ")}</p>
      {it.status === "answered" ? (
        <div className="mt-1 rounded bg-emerald-50 p-1.5 text-xs">
          <b>회신</b> {it.answer_ko}
          {it.lang !== "ko" && <span className="block text-slate-500">{it.answer_translated ? `→ ${it.answer_translated}` : "(번역 안 됨: 한국어로 전달)"}</span>}
        </div>
      ) : (
        <div className="mt-1 flex gap-1">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} aria-label={`이슈 ${it.id} 회신`}
            placeholder="한국어로 회신 (근로자 언어로 자동 번역)" className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && send()} />
          <Button disabled={busy || !text.trim()} onClick={send}>{busy ? "…" : "회신"}</Button>
        </div>
      )}
    </li>
  );
}

export default function IssueInbox({ tbmId, meta }: { tbmId: number; meta: Meta }) {
  const { data, reload } = useFetch<FieldIssue[]>(`/tbms/${tbmId}/issues`);
  usePoll(reload, 3000, true);
  const open = data?.filter((i) => i.status === "open").length ?? 0;
  return (
    <Panel title="현장 이슈함" right={<span className="text-xs text-slate-400">미회신 {open}건 · 긴급 먼저</span>}>
      {!data?.length ? <p className="text-xs text-slate-400">아직 없음</p> : (
        <ul className="space-y-2">{data.map((it) => <IssueRow key={it.id} it={it} meta={meta} onDone={reload} />)}</ul>
      )}
    </Panel>
  );
}
