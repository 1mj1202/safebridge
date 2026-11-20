// 구역 고르기 (구역 QR 로 들어오면 건너뜀) — 작업 구역 먼저, 출입 통제 구역은 회색
import type { ZoneRow } from "./fieldTypes";

export default function ZonePicker({ greet, zones, onPick }: { greet: string; zones: ZoneRow[]; onPick: (z: string) => void }) {
  return (
    <div className="mx-auto max-w-md p-5">
      <p className="mb-4 rounded-2xl rounded-tl-none bg-white p-4 text-lg shadow">🤖 {greet}</p>
      <div className="grid gap-3">
        {zones.map((z) => (
          <button key={z.zone} onClick={() => onPick(z.zone)}
            className={`rounded-2xl p-4 text-left shadow ring-1 ${z.restricted ? "bg-slate-100 text-slate-500 ring-slate-200" : "bg-white ring-blue-200"}`}>
            <div className="text-xl font-bold">{z.restricted ? "⛔" : "📍"} {z.label}</div>
            {z.teams.length > 0 && <div className="text-sm text-slate-500">{z.teams.join(" · ")}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}
