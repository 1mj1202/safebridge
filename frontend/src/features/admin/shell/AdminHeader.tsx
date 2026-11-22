// 머리글: SafeBridge · 현장명 | 기상 배지(기준 초과 시 주황·빨강) · 초안 상태 배지 · 로그인 부류
import { CloudSun, Wind } from "lucide-react";
import type { Assessment, RiskResponse, Tbm } from "../../../shared/types";
import { shortDay } from "../dates";
import StaffBadge from "../StaffBadge";

interface Props {
  site?: string;
  risk: RiskResponse | null;
  a: Assessment | null;
  tbm: Tbm | null;
}

export default function AdminHeader({ site, risk, a, tbm }: Props) {
  const f = risk?.weather.forecast;
  const alerts = risk?.weather.alerts ?? [];
  const worst = alerts.find((x) => x.level === "stop") ?? alerts.find((x) => x.level === "warn");
  const wind = worst?.code.startsWith("wind");
  const status = tbm ? { text: "발행됨", cls: "bg-emerald-600" }
    : a?.status === "approved" ? { text: "승인됨", cls: "bg-brand-600" }
    : a ? { text: "승인 대기", cls: "bg-orange-500" } : null;

  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-ink px-4 py-2.5 text-white">
      <img src="/favicon.svg" alt="" className="h-7 w-7" />
      <h1 className="text-lg font-bold">SafeBridge</h1>
      {site && <span className="hidden text-sm text-slate-300 sm:inline">{site}</span>}
      <span className="ml-auto flex flex-wrap items-center gap-2 text-xs">
        {f && (
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${
            worst?.level === "stop" ? "bg-red-600" : worst ? "bg-orange-500" : "bg-slate-700 text-slate-200"}`}
            title={worst?.text ?? f.source}>
            {wind ? <Wind size={13} /> : <CloudSun size={13} />}
            {shortDay(f.date)} <span className="hidden sm:inline">{f.sky} · </span>순간풍속 {f.wind_gust}m/s
          </span>
        )}
        {status && <span className={`rounded-full px-2.5 py-1 font-semibold ${status.cls}`}>{status.text}</span>}
        <StaffBadge />
      </span>
    </header>
  );
}
