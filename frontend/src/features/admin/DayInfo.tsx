// 선택 날짜의 진행 작업·기상 판정
import type { RiskResponse } from "../../shared/types";

export default function DayInfo({ risk }: { risk: RiskResponse }) {
  const fc = risk.weather.forecast;
  const tasks = risk.tasks.filter((t) => t.trade !== "양생");
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl bg-white p-3 text-sm shadow-sm ring-1 ring-slate-200">
        <div className="mb-1 text-xs font-bold text-slate-500">진행 작업 (4D 공정)</div>
        {tasks.length === 0 ? <p className="text-slate-400">위험 작업 없음</p> : (
          <ul className="space-y-0.5">
            {tasks.map((t) => <li key={t.id}>• {t.name} <span className="text-slate-400">({t.crew}명)</span></li>)}
          </ul>
        )}
      </div>
      <div className="rounded-xl bg-white p-3 text-sm shadow-sm ring-1 ring-slate-200">
        <div className="mb-1 text-xs font-bold text-slate-500">기상 ({fc.source})</div>
        <p>{fc.sky} · 순간풍속 {fc.wind_gust}m/s · 강수 {fc.rain_mm_h}mm/h · {fc.temp_min}~{fc.temp_max}℃</p>
        {risk.weather.alerts.map((a) => (
          <p key={a.code} className={a.level === "info" ? "text-slate-600" : "font-semibold text-red-700"}>⚠ {a.text}</p>
        ))}
      </div>
    </div>
  );
}
