// 현장소장·원청 홈(휴대폰 우선): 오늘 승인할 일 + 큰 승인 버튼 + 현장 요약
import { CircleCheck, FileText } from "lucide-react";
import { useState } from "react";
import { useStaff } from "../../../../shared/staff";
import { Panel } from "../../../../shared/ui";
import { shortDay } from "../../dates";
import type { MenuId } from "../../shell/menu";
import type { AdminState } from "../../useAdminState";
import type { InboxCounts } from "../../useInboxCounts";
import HazardList from "./HazardList";
import TodayStats from "./TodayStats";
import { topHazards } from "./topHazards";

export default function ManagerHome({ s, c, goto }: { s: AdminState; c: InboxCounts; goto: (m: MenuId) => void }) {
  const { can } = useStaff();
  const [confirm, setConfirm] = useState(false);
  const { a, tbm } = s;
  const approved = a?.status === "approved";
  const n = a ? a.draft.items.filter((i) => i.included !== false).length : 0;

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <Panel title={a ? `${shortDay(a.work_date)} ${a.storey} 위험성평가` : "오늘 승인할 일"}
        right={a && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white ${
          tbm ? "bg-emerald-600" : approved ? "bg-brand-600" : "bg-orange-500"}`}>{tbm ? "발행됨" : approved ? "승인됨" : "승인 대기"}</span>}>
        {!a ? <p className="text-sm text-slate-400">안전관리자가 초안을 만들면 여기에 보여요.</p> : (
          <div className="space-y-3">
            <HazardList items={topHazards(a)} />
            <p className="text-xs text-slate-500">위험 항목 {n}개 · 대책은 초안에서 볼 수 있어요</p>
            {!approved && can("approve") && !s.stale && (confirm ? (
              <div className="space-y-2 rounded-xl bg-emerald-50 p-3">
                <p className="text-sm font-semibold">이 초안을 승인할까요?</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConfirm(false)}
                    className="flex-1 rounded-xl border border-slate-300 bg-white py-3 text-sm">취소</button>
                  <button type="button" disabled={s.busy} onClick={async () => { await s.approve(); setConfirm(false); }}
                    className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white disabled:opacity-50">승인</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-lg font-bold text-white active:bg-emerald-700">
                <CircleCheck size={22} />승인하기</button>
            ))}
            {approved && !tbm && <p className="text-sm text-blue-700">승인했어요. 안전관리자가 발행하면 근로자에게 전달돼요.</p>}
            <button type="button" onClick={() => goto("draft")}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2.5 text-sm text-slate-700">
              <FileText size={16} />초안 자세히 보기</button>
          </div>
        )}
      </Panel>
      <TodayStats tbmId={tbm?.id ?? null} c={c} goto={goto} />
    </div>
  );
}
