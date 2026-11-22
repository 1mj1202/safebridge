// 근로자 현재 위치 — 업체 필터 · 구역 평면(층별 칸, 인원 수) · 명단(마지막 태그 구역, 몇 분 전, 교육 확인)
import { CircleAlert, CircleCheck, MapPin, Users } from "lucide-react";
import { useState } from "react";
import { Panel } from "../../shared/ui";
import { ago, companiesOf, countByZone, sortWorkers, sourceLabel, zoneGrid, type Locations, type WorkerLoc } from "./locations";

export default function WorkerLocations({ data, error, workers, company, onCompany, zones, langs }: {
  data: Locations | null; error: string | null; workers: WorkerLoc[]; company: string; onCompany: (c: string) => void;
  zones: string[]; langs: Record<string, string> }) {
  const [zone, setZone] = useState<string | null>(null);
  if (!data) return <Panel title="근로자 현재 위치"><p className="text-xs text-slate-400">{error ?? "불러오는 중…"}</p></Panel>;
  const anon = !!data.anonymous;
  const ok = workers.filter((w) => w.zone && w.fresh && w.understood).length;
  const counts = countByZone(workers);
  const grid = zoneGrid([...zones, ...workers.flatMap((w) => (w.zone ? [w.zone] : []))]);
  const here = workers.filter((w) => w.zone && w.fresh).length;
  const list = sortWorkers(zone ? workers.filter((w) => w.zone === zone) : workers);

  return (
    <Panel title={anon ? "구역별 인원 · 교육 확인" : "근로자 현재 위치"} right={anon ? undefined :
      <select value={company} onChange={(e) => onCompany(e.target.value)} aria-label="업체"
        className="rounded border border-slate-200 px-1.5 py-0.5 text-xs">
        <option value="">전체 업체</option>
        {companiesOf(data.workers).map((c) => <option key={c} value={c}>{c}</option>)}
      </select>}>
      <p className="mb-2 flex items-center gap-1 text-xs text-slate-500">
        <Users size={13} />{anon
          ? `현장 ${here}명 · 교육 확인 ${ok}/${here}명${here ? ` (${Math.round((ok / here) * 100)}%)` : ""} · 마지막 태그 구역 기준`
          : `현장 ${here}명 · 가입 ${workers.length}명 · 마지막 태그 구역 기준(15초마다 갱신, ${data.fresh_hours}시간 지나면 제외)`}</p>
      <div className="space-y-1">
        {grid.map((r) => (
          <div key={r.storey} className="flex items-stretch gap-1">
            <span className="w-8 shrink-0 self-center text-right text-xs font-semibold text-slate-500">{r.storey}</span>
            {r.zones.map((z) => {
              const c = counts.get(z);
              return (
                <button key={z} onClick={() => setZone(zone === z ? null : z)} aria-pressed={zone === z}
                  className={`flex flex-1 items-center justify-between rounded-md border px-2 py-1.5 text-xs ${zone === z ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200"} ${c ? "bg-emerald-50" : "bg-white"}`}>
                  <span className="truncate">{z.replace(/^\S+동\s/, "")}</span>
                  <span className="flex items-center gap-1">
                    {c && c.pending > 0 && <span className="flex items-center gap-0.5 text-amber-700"><CircleAlert size={12} />{c.pending}</span>}
                    <b className={c ? "text-emerald-700" : "text-slate-300"}>{c?.count ?? 0}명</b>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {anon ? (
        <p className="mt-3 text-xs text-slate-400">발주처·감리 화면은 익명·구역 중심이라 이름·업체 없이 구역별 인원과 교육 미확인 인원만 보여요.</p>
      ) : list.length === 0 ? (
        <p className="mt-3 text-center text-xs text-slate-400">{zone ? "이 구역에 태그한 근로자가 없어요" : "아직 가입한 근로자가 없어요"}</p>
      ) : (
      <table className="mt-3 w-full text-xs">
        <thead className="text-left text-slate-400">
          <tr><th className="py-1 font-normal">이름</th><th className="font-normal">업체</th><th className="font-normal">위치</th>
            <th className="font-normal">태그</th><th className="font-normal">교육</th></tr>
        </thead>
        <tbody>
          {list.map((w) => (
            <tr key={w.id} className={`border-t border-slate-100 ${w.fresh ? "" : "text-slate-400"}`}>
              <td className="py-1 font-medium">{w.name} <span className="text-slate-400">{langs[w.lang] ?? w.lang}</span></td>
              <td>{w.company}</td>
              <td>{w.zone ? <span className="flex items-center gap-0.5"><MapPin size={11} />{w.zone.replace(/^\S+동\s/, "")}</span> : "-"}</td>
              <td>{ago(w.minutes)}{sourceLabel(w.source) ? ` · ${sourceLabel(w.source)}` : ""}</td>
              <td>{w.zone ? (w.understood
                ? <CircleCheck size={14} className="text-emerald-600" aria-label="확인" />
                : <span className="flex items-center gap-0.5 text-amber-700"><CircleAlert size={12} />미확인</span>) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </Panel>
  );
}
