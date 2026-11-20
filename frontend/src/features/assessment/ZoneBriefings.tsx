// 구역별 챗봇 브리핑 미리보기 — 승인하면 근로자 챗봇이 이 내용 안에서만 안내한다
import { Chip, LevelBadge, Panel } from "../../shared/ui";
import type { DraftItem, Meta, ZoneBriefing } from "../../shared/types";

export default function ZoneBriefings({ briefings, items, meta, approved }: {
  briefings: ZoneBriefing[]; items: DraftItem[]; meta: Meta; approved: boolean }) {
  const off = new Set(items.filter((i) => i.included === false).map((i) => i.id));
  return (
    <Panel title="구역별 챗봇 브리핑" right={<span className="text-xs text-slate-400">{approved ? "승인됨 · 근로자에게 안내 중" : "초안 승인 시 함께 확정"}</span>}>
      <div className="grid gap-2 sm:grid-cols-2">
        {briefings.map((b) => (
          <section key={b.zone} className={`rounded-lg border p-2 text-xs ${b.restricted ? "border-red-200 bg-red-50/50" : "border-slate-200"}`}>
            <div className="flex flex-wrap items-center gap-1">
              <b className="text-sm">{b.restricted ? "⛔" : "📍"} {b.zone}</b>
              {b.restricted && <Chip tone="red">출입 통제</Chip>}
            </div>
            {b.teams.length > 0 && (
              <p className="mt-1 text-slate-600">{b.teams.map((t) => `${t.team}(${t.company})`).join(" · ")}</p>
            )}
            <p className="text-slate-400">{b.langs.map((l) => meta.langs[l] ?? l).join(", ")}</p>
            {b.weather.filter((w) => !off.has(w.item_id)).map((w) => <p key={w.item_id} className="mt-1">🌬️ {w.text}</p>)}
            {b.build.map((t) => <p key={t} className="mt-1">🏗️ {t}</p>)}
            <ol className="mt-1 space-y-0.5">
              {b.safety.filter((s) => !off.has(s.item_id)).map((s) => (
                <li key={s.item_id} className="flex items-center gap-1">
                  <span className="w-10 font-bold text-red-700">{s.rank ? `${s.rank}순위` : s.item_id}</span>
                  <LevelBadge level={s.level} /> {s.hazard}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </Panel>
  );
}
