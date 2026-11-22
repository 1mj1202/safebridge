// 발주처·감리 홈(휴대폰 우선, 보기 전용): 오늘 요약 한 화면 — 상태·기상·위험 상위 3·확인율·신고
import { CloudSun, Wind } from "lucide-react";
import { Panel } from "../../../../shared/ui";
import { shortDay } from "../../dates";
import type { MenuId } from "../../shell/menu";
import type { AdminState } from "../../useAdminState";
import type { InboxCounts } from "../../useInboxCounts";
import HazardList from "./HazardList";
import TodayStats from "./TodayStats";
import { topHazards } from "./topHazards";

export default function ViewerHome({ s, c, goto }: { s: AdminState; c: InboxCounts; goto: (m: MenuId) => void }) {
  const { a, tbm, risk } = s;
  const f = risk?.weather.forecast;
  const alert = risk?.weather.alerts.find((x) => x.level === "stop") ?? risk?.weather.alerts.find((x) => x.level === "warn");
  const status = tbm ? "근로자에게 발행됨" : a?.status === "approved" ? "현장소장 승인, 발행 전" : a ? "현장소장 승인 대기" : "초안 작성 전";

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <Panel title={a ? `${shortDay(a.work_date)} ${a.storey} 안전 현황` : "오늘 안전 현황"}>
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">{status}</p>
          {f && (
            <p className={`flex items-start gap-2 rounded-lg p-2 text-sm ${alert ? "bg-orange-50 text-orange-800" : "bg-slate-50 text-slate-600"}`}>
              {alert?.code.startsWith("wind") ? <Wind size={16} className="mt-0.5 shrink-0" /> : <CloudSun size={16} className="mt-0.5 shrink-0" />}
              {alert?.text ?? `${f.sky} · 순간풍속 ${f.wind_gust}m/s`}
            </p>
          )}
          <HazardList items={topHazards(a)} />
        </div>
      </Panel>
      <TodayStats tbmId={tbm?.id ?? null} c={c} goto={goto} />
      <button type="button" onClick={() => goto("map")}
        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm text-slate-700">위험 지도에서 보기</button>
    </div>
  );
}
