// 메뉴 ④ 확인 현황: 근로자 교육 확인 현황 + 사진 증빙 + 근로자 현재 위치
import { Panel } from "../../../shared/ui";
import PhotoInbox from "../../tbm/PhotoInbox";
import StatusPanel from "../../tbm/StatusPanel";
import type { Locations, WorkerLoc } from "../locations";
import type { AdminState } from "../useAdminState";
import WorkerLocations from "../WorkerLocations";

interface Props {
  s: AdminState;
  loc: { data: Locations | null; error: string | null };
  workers: WorkerLoc[];
  company: string;
  onCompany: (c: string) => void;
}

export default function StatusView({ s, loc, workers, company, onCompany }: Props) {
  const { tbm, meta, a } = s;
  return (
    <div className="grid gap-4 p-4 lg:grid-cols-2">
      <div className="min-w-0 space-y-4">
        {tbm && meta ? <StatusPanel tbmId={tbm.id} meta={meta} />
          : <Panel title="확인 현황"><p className="text-xs text-slate-400">TBM을 발행하면 언어별 확인 현황이 보여요.</p></Panel>}
        {tbm && <PhotoInbox tbmId={tbm.id} />}
      </div>
      <div className="min-w-0">
        <WorkerLocations data={loc.data} error={loc.error} workers={workers} company={company} onCompany={onCompany}
          zones={(a?.draft.briefings ?? []).map((b) => b.zone)} langs={meta?.langs ?? {}} />
      </div>
    </div>
  );
}
