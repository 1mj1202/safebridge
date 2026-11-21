// 구역 하나의 챗봇 브리핑 카드: 팀·언어, 날씨·시공·안전 안내 (초안에서 뺀 항목은 숨김)
import { Ban, Construction, MapPin, Wind } from "lucide-react";
import { Chip, LevelBadge } from "../../shared/ui";
import type { Meta, ZoneBriefing } from "../../shared/types";

export default function BriefingCard({ b, off, meta }: { b: ZoneBriefing; off: Set<string>; meta: Meta }) {
  return (
    <section className={`rounded-lg border p-2 text-xs ${b.restricted ? "border-red-200 bg-red-50/50" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-center gap-1">
        <b className="flex items-center gap-1 text-sm">{b.restricted ? <Ban size={14} className="text-red-600" /> : <MapPin size={14} className="text-slate-500" />}{b.zone}</b>
        {b.restricted && <Chip tone="red">출입 통제</Chip>}
      </div>
      {b.teams.length > 0 && (
        <p className="mt-1 text-slate-600">{b.teams.map((t) => `${t.team}(${t.company})`).join(" · ")}</p>
      )}
      <p className="text-slate-400">{b.langs.map((l) => meta.langs[l] ?? l).join(", ")}</p>
      {b.weather.filter((w) => !off.has(w.item_id)).map((w) => <p key={w.item_id} className="mt-1 flex items-start gap-1"><Wind size={13} className="mt-0.5 shrink-0 text-slate-500" />{w.text}</p>)}
      {b.build.map((t) => <p key={t} className="mt-1 flex items-start gap-1"><Construction size={13} className="mt-0.5 shrink-0 text-slate-500" />{t}</p>)}
      <ol className="mt-1 space-y-0.5">
        {b.safety.filter((s) => !off.has(s.item_id)).map((s) => (
          <li key={s.item_id} className="flex items-center gap-1">
            <span className="w-10 font-bold text-red-700">{s.rank ? `${s.rank}순위` : s.item_id}</span>
            <LevelBadge level={s.level} /> {s.hazard}
          </li>
        ))}
      </ol>
    </section>
  );
}
