// 구역 고르기 (구역 QR·NFC 로 들어오면 건너뜀, 직접 고르기도 유지) — 작업 구역 먼저, 출입 통제 구역은 회색
import type { ZoneRow } from "./fieldTypes";

export default function ZonePicker({ greet, hint, zones, onPick, nfc }: {
  greet: string; hint: string; zones: ZoneRow[]; onPick: (z: string) => void;
  nfc: { supported: boolean; active: boolean; start: () => void } }) {
  return (
    <div className="mx-auto max-w-md p-5">
      <p className="mb-2 rounded-2xl rounded-tl-none bg-white p-4 text-lg shadow">🤖 {greet}</p>
      <p className="mb-4 rounded-xl bg-blue-50 p-3 text-blue-900">📷 📶 {hint}</p>
      {nfc.supported && (
        <button onClick={nfc.start} disabled={nfc.active}
          className="mb-4 w-full rounded-2xl bg-slate-900 py-3 text-lg font-bold text-white disabled:bg-blue-600">
          📶 NFC {nfc.active ? "…" : ""}</button>
      )}
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
