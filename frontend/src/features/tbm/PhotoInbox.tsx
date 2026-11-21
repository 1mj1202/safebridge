// 안전시설 사진 증빙함 — 구역별 사진(얼굴 흐림·촬영정보 제거본), AI 참고 판정, 반장 확인 → TBM 기록 첨부. 미증빙 구역 표시
import { useState } from "react";
import { api } from "../../shared/api";
import { useFetch, usePoll } from "../../shared/hooks";
import { useStaff } from "../../shared/staff";
import { Button, Chip, Panel } from "../../shared/ui";
import type { SitePhoto } from "../../shared/types";

const AI = { ok: { tone: "blue", text: "AI: 시설 보임" }, check: { tone: "amber", text: "AI: 확인 필요" },
  skipped: { tone: "slate", text: "AI 확인 없음" } } as const;

function PhotoRow({ p, onDone }: { p: SitePhoto; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const canConfirm = useStaff().can("photo");
  const confirm = async () => {
    setBusy(true);
    try { await api.post(`/photos/${p.id}/confirm`, {}); onDone(); } finally { setBusy(false); }
  };
  return (
    <li className="flex gap-2 rounded-lg bg-slate-50 p-2 text-sm">
      <a href={`/api/photos/${p.id}/image`} target="_blank" rel="noopener noreferrer" className="shrink-0">
        <img src={`/api/photos/${p.id}/image`} alt={`${p.zone} 사진`} className="h-16 w-16 rounded object-cover" />
      </a>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1">
          <b>{p.zone}</b>
          <Chip tone={AI[p.ai_status].tone}>{AI[p.ai_status].text}</Chip>
          {p.faces_blurred > 0 && <Chip>얼굴 {p.faces_blurred}명 흐림</Chip>}
        </div>
        <p className="text-xs text-slate-500">{p.request}{p.ai_note && ` · ${p.ai_note}`}</p>
      </div>
      {p.status === "confirmed" ? <span className="self-center text-xs font-semibold text-emerald-700">확인됨</span>
        : canConfirm ? <Button disabled={busy} onClick={confirm}>확인</Button>
        : <span className="self-center text-xs text-slate-400">확인 대기</span>}
    </li>
  );
}

export default function PhotoInbox({ tbmId }: { tbmId: number }) {
  const { data, reload } = useFetch<{ photos: SitePhoto[]; missing: string[] }>(`/tbms/${tbmId}/photos`);
  usePoll(reload, 5000, true);
  const pending = data?.photos.filter((p) => p.status === "pending").length ?? 0;
  return (
    <Panel title="사진 증빙" right={<span className="text-xs text-slate-400">확인 대기 {pending}장</span>}>
      {data && data.missing.length > 0 && (
        <p className="mb-2 rounded bg-amber-50 p-2 text-xs text-amber-800">미증빙 구역: {data.missing.join(", ")}</p>
      )}
      {!data?.photos.length ? <p className="text-xs text-slate-400">아직 없음</p> : (
        <ul className="space-y-1.5">{data.photos.map((p) => <PhotoRow key={p.id} p={p} onDone={reload} />)}</ul>
      )}
    </Panel>
  );
}
