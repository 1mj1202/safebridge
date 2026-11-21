// 메뉴 ③ 발행: 승인된 초안 → 구역 QR·언어별 카드. 승인 전이면 안내만
import { useStaff } from "../../../shared/staff";
import { Panel } from "../../../shared/ui";
import PublishPanel from "../../tbm/PublishPanel";
import type { AdminState } from "../useAdminState";

export default function PublishView({ s, onDraft }: { s: AdminState; onDraft: () => void }) {
  const { can } = useStaff();
  const { a, tbm, meta, stale } = s;
  const ready = a?.status === "approved" && !stale;
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      {!ready || !meta ? (
        <Panel title="TBM 발행">
          <p className="text-sm text-slate-500">초안 승인 후 발행할 수 있어요.{" "}
            <button type="button" className="underline" onClick={onDraft}>TBM 초안 보기</button></p>
        </Panel>
      ) : !tbm && !can("publish") ? (
        <Panel title="TBM 발행"><p className="text-sm text-slate-500">승인됐어요. 안전관리자가 발행하면 QR이 여기에 보여요.</p></Panel>
      ) : (
        <PublishPanel tbm={tbm} meta={meta} busy={s.busy} onPublish={s.publish} zones={a!.draft.briefings ?? []} />
      )}
    </div>
  );
}
