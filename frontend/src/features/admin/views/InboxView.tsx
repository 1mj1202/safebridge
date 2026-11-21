// 메뉴 ⑤ 신고함: 근로자 현장 이슈 (긴급 먼저, 모국어 회신)
import { Panel } from "../../../shared/ui";
import IssueInbox from "../../tbm/IssueInbox";
import type { AdminState } from "../useAdminState";

export default function InboxView({ s }: { s: AdminState }) {
  return (
    <div className="mx-auto max-w-3xl p-4">
      {s.tbm && s.meta ? <IssueInbox tbmId={s.tbm.id} meta={s.meta} />
        : <Panel title="현장 이슈함"><p className="text-xs text-slate-400">TBM을 발행하면 근로자가 보낸 질문·위험 신고가 여기에 모여요.</p></Panel>}
    </div>
  );
}
