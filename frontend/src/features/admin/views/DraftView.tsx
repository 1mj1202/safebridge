// 메뉴 ② TBM 초안: 위험성평가 항목(한 줄씩, 눌러 펼침) + 구역별 챗봇 브리핑 | 사진 증빙·이슈함 요약
import { useStaff } from "../../../shared/staff";
import { Panel } from "../../../shared/ui";
import DraftDateNotice from "../../assessment/DraftDateNotice";
import DraftReview from "../../assessment/DraftReview";
import ZoneBriefings from "../../assessment/ZoneBriefings";
import type { AdminState } from "../useAdminState";
import type { InboxCounts } from "../useInboxCounts";
import InboxSummary from "./InboxSummary";

interface Props {
  s: AdminState;
  c: InboxCounts;
  onFocusZones: (ids: string[]) => void;
  onBackToDraftDay: () => void;
  goto: (m: "map" | "status" | "inbox") => void;
}

export default function DraftView({ s, c, onFocusZones, onBackToDraftDay, goto }: Props) {
  const { can } = useStaff();
  const { a, meta, day, stale } = s;
  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4 pb-4">
        {!a ? (
          <Panel title="위험성평가 초안">
            <p className="text-sm text-slate-500">
              {can("analyze") ? <>아직 초안이 없어요. <button type="button" className="underline" onClick={() => goto("map")}>위험 지도</button>에서 위험 분석을 하면 초안이 만들어져요.</>
                : "안전관리자가 초안을 만들면 여기에 보여요."}
            </p>
          </Panel>
        ) : (<>
          {stale && day && (
            <DraftDateNotice draftDay={a.work_date} viewDay={day} today={meta?.today} noWork={s.noWork} busy={s.busy}
              onBack={onBackToDraftDay} onReanalyze={can("analyze") ? () => s.ask(a.query) : undefined} />
          )}
          <DraftReview a={a} busy={s.busy} onSave={s.save} onApprove={s.approve} frozen={stale} onFocusZones={onFocusZones} />
          {a.draft.briefings && meta && (
            <div className={stale ? "pointer-events-none opacity-50" : ""} aria-disabled={stale}>
              <ZoneBriefings briefings={a.draft.briefings} items={a.draft.items} meta={meta} approved={a.status === "approved"} />
            </div>
          )}
        </>)}
      </div>
      <InboxSummary published={!!s.tbm} c={c} onPhotos={() => goto("status")} onIssues={() => goto("inbox")} />
    </div>
  );
}
