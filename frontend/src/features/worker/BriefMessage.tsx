// 챗봇 첫 메시지: 구역 브리핑 — 제목·소제목 없이 3D/평면도 · 날씨 · 시공 · 위험 순위 · 확인할 것
import { CircleCheck, Construction, MessageSquareText, Wind } from "lucide-react";
import Pictogram from "./Pictogram";
import ZoneView from "./ZoneView";
import type { Brief } from "./fieldTypes";
import { cardSpeech } from "./speech";

const ICON = { weather: Wind, build: Construction, safety: null } as const;

function Icon({ of: C }: { of: typeof Wind }) {
  return <span className="flex w-6 shrink-0 justify-center text-slate-500"><C size={18} strokeWidth={1.75} /></span>;
}

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
                : !l.pictogram && ICON[s.type] && <Icon of={ICON[s.type]!} />}
              {l.pictogram && (
                <span className="flex w-6 shrink-0 justify-center">
                  <Pictogram name={l.pictogram}
                    className={`${big ? "h-6 w-6" : "h-5 w-5"} ${s.type === "weather" ? "text-slate-500" : l.level === "상" ? "text-red-600" : "text-orange-500"}`} />
                </span>
              )}
              <span className={l.level === "상" ? "font-semibold" : ""}>{l.text}</span>
            </li>
          ))}
        </ul>
      ))}
      {brief.checks.length > 0 && (
        <ul className="space-y-1.5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
          {brief.checks.map((c) => (
            <li key={c} className="flex items-start gap-2"><CircleCheck size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-emerald-600" />{c}</li>
          ))}
        </ul>
      )}
      {brief.memo && (
        <p className="flex items-start gap-2"><MessageSquareText size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-slate-500" />{brief.memo}</p>
      )}
    </div>
  );
}
