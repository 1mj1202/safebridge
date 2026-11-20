// 챗봇 첫 메시지: 구역 브리핑 — 제목·소제목 없이 3D/평면도 · 🌬️ 날씨 · 위험 순위 · ✅ 확인할 것
import Pictogram from "./Pictogram";
import ZoneView from "./ZoneView";
import type { Brief } from "./fieldTypes";
import { cardSpeech } from "./speech";

const ICON = { weather: "🌬️", build: "🏗️", safety: "" } as const;

export function briefSpeech(b: Brief): string {
  return cardSpeech(b.title, [...b.sections.flatMap((s) => s.lines.map((l) => l.text)), ...b.checks, b.memo].filter(Boolean));
}

export default function BriefMessage({ brief, big, token }: { brief: Brief; big: boolean; token: string }) {
  const size = big ? "text-xl" : "text-base";
  return (
    <div className={`space-y-3 ${size} ${brief.restricted ? "rounded-2xl p-2 ring-2 ring-red-500" : ""}`}>
      <ZoneView key={brief.zone} token={token} zone={brief.zone} plan={brief.plan} />
      {brief.sections.filter((s) => s.lines.length).map((s) => (
        <ul key={s.type} className="space-y-2">
          {s.lines.map((l, i) => (
            <li key={i} className="flex items-center gap-3">
              {l.rank ? <span className="w-6 shrink-0 text-center text-sm font-bold text-red-600">{l.rank}</span>
                : !l.pictogram && ICON[s.type] && <span className="w-6 shrink-0 text-center">{ICON[s.type]}</span>}
              {l.pictogram && (
                <Pictogram name={l.pictogram}
                  className={`${big ? "h-12 w-12" : "h-9 w-9"} shrink-0 ${l.level === "상" ? "text-red-600" : "text-orange-500"}`} />
              )}
              <span className={l.level === "상" ? "font-semibold" : ""}>{l.text}</span>
            </li>
          ))}
        </ul>
      ))}
      {brief.checks.length > 0 && (
        <ul className="space-y-1 rounded-2xl bg-emerald-50 p-3">
          {brief.checks.map((c) => <li key={c}>✅ {c}</li>)}
        </ul>
      )}
      {brief.memo && <p>💬 {brief.memo}</p>}
    </div>
  );
}
