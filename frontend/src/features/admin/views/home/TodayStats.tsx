// 홈 공통: 확인율 · 미처리 신고 · 확인할 사진 (누르면 그 메뉴로)
import type { InboxCounts } from "../../useInboxCounts";
import type { MenuId } from "../../shell/menu";
import Stat from "./Stat";
import { useAckRate } from "./useAckRate";

export default function TodayStats({ tbmId, c, goto }: { tbmId: number | null; c: InboxCounts; goto: (m: MenuId) => void }) {
  const ack = useAckRate(tbmId);
  return (
    <div className="flex gap-2">
      <Stat label="이해율" value={ack.rate === null ? "-" : `${ack.rate}%`} sub={tbmId ? `${ack.understood}/${ack.viewed}명` : "발행 전"}
        tone={ack.rate !== null && ack.rate >= 80 ? "green" : "slate"} onClick={() => goto("status")} />
      <Stat label="미처리 신고" value={String(c.openIssues)} sub={c.urgentIssues ? `긴급 ${c.urgentIssues}` : undefined}
        tone={c.urgentIssues ? "red" : "slate"} onClick={() => goto("inbox")} />
      <Stat label="확인할 사진" value={String(c.pendingPhotos)} onClick={() => goto("status")} />
    </div>
  );
}
