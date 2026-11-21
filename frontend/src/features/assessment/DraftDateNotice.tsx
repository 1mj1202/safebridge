// 보고 있는 날짜와 초안 작업일이 다를 때 경고 — 이전 초안은 보존하되 그대로는 승인·발행할 수 없게 한다
import { CalendarX } from "lucide-react";
import { Button } from "../../shared/ui";
import { label } from "../admin/dates";

export default function DraftDateNotice({ draftDay, viewDay, today, noWork, busy, onBack, onReanalyze }: {
  draftDay: string; viewDay: string; today?: string; noWork: boolean; busy: boolean;
  onBack: () => void; onReanalyze?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="flex items-center gap-1.5 font-semibold"><CalendarX size={16} />
        아래 초안은 {label(draftDay, today)} 작업 기준이에요</p>
      <p className="mt-0.5 text-xs">
        지금 보는 날짜는 {label(viewDay, today)}입니다.
        {noWork ? " 이 날은 분석할 위험 작업이 없어요." : ""} 날짜가 다른 동안에는 수정·승인·발행이 잠겨요.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button kind="ghost" onClick={onBack}>{label(draftDay, today)}로 돌아가기</Button>
        {!noWork && onReanalyze && <Button disabled={busy} onClick={onReanalyze}>{label(viewDay, today)} 새로 분석</Button>}
      </div>
    </div>
  );
}
