// 챗봇 첫 메시지: 구역 브리핑 (3D/평면도 · 날씨 · 시공 · 안전 순위 · 확인할 것) + 음성
import Pictogram from "./Pictogram";
import ZoneView from "./ZoneView";
import type { Brief } from "./fieldTypes";
import { canSpeak, cardSpeech, speak } from "./speech";

const ICON = { weather: "🌬️", build: "🏗️", safety: "⚠️" } as const;

export function briefSpeech(b: Brief): string {
  return cardSpeech(b.title, [...b.sections.flatMap((s) => [s.title, ...s.lines.map((l) => l.text)]), ...b.checks, b.memo]
    .filter(Boolean));
}

export default function BriefMessage({ brief, lang, big, listen, token }: {
  brief: Brief; lang: string; big: boolean; listen: string; token: string }) {
  return (
    <div className={`rounded-2xl rounded-tl-none bg-white p-4 shadow ${brief.restricted ? "ring-2 ring-red-500" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className={`${big ? "text-2xl" : "text-lg"} font-bold`}>🤖 {brief.title}</h2>
        {canSpeak() && (
          <button onClick={() => speak(briefSpeech(brief), lang)}
            className="shrink-0 rounded-full bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white">🔊 {listen}</button>
        )}
      </div>
      <ZoneView key={brief.zone} token={token} zone={brief.zone} plan={brief.plan} />
      {brief.sections.filter((s) => s.lines.length).map((s) => (
        <section key={s.type} className="mt-3">
          <h3 className="text-sm font-bold text-slate-500">{ICON[s.type]} {s.title}</h3>
          <ul className={`mt-1 space-y-2 ${big ? "text-xl" : "text-base"}`}>
            {s.lines.map((l, i) => (
              <li key={i} className="flex items-center gap-3">
                {l.rank && <span className="w-6 shrink-0 text-center text-sm font-bold text-red-600">{l.rank}</span>}
                {l.pictogram && (
                  <Pictogram name={l.pictogram}
                    className={`${big ? "h-12 w-12" : "h-9 w-9"} shrink-0 ${l.level === "상" ? "text-red-600" : "text-orange-500"}`} />
                )}
                <span className={l.level === "상" ? "font-semibold" : ""}>{l.text}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {brief.checks.length > 0 && (
        <ul className={`mt-3 space-y-1 rounded-xl bg-emerald-50 p-3 ${big ? "text-xl" : "text-base"}`}>
          {brief.checks.map((c) => <li key={c}>✅ {c}</li>)}
        </ul>
      )}
      {brief.memo && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-sm">💬 {brief.memo}</p>}
    </div>
  );
}
