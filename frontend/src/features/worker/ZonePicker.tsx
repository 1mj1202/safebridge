// 구역 고르기 (구역 QR·NFC 로 들어오면 건너뜀, 직접 고르기도 유지) — 출입 통제 구역은 ⛔ 회색
import type { ZoneRow } from "./fieldTypes";

export default function ZonePicker({ greet, zones, onPick, nfc }: {
  greet: string; zones: ZoneRow[]; onPick: (z: string) => void;
  nfc: { supported: boolean; active: boolean; start: () => void } }) {
  return (
    <div className="mx-auto min-h-screen max-w-md space-y-3 bg-white p-5 pt-10">
      <p className="mb-4 text-xl">{greet}</p>
      {nfc.supported && (
        <button onClick={nfc.start} disabled={nfc.active}
          className="w-full rounded-full bg-slate-900 py-3 text-lg font-bold text-white disabled:bg-blue-600">
          📶 NFC {nfc.active ? "…" : ""}</button>
      )}
      {zones.map((z) => (
        <button key={z.zone} onClick={() => onPick(z.zone)}
          className={`w-full rounded-2xl border px-4 py-3.5 text-left text-lg font-semibold active:bg-slate-100 ${z.restricted ? "border-slate-100 text-slate-400" : "border-slate-200"}`}>
          {z.restricted ? "⛔ " : "📍 "}{z.label}
        </button>
      ))}
    </div>
  );
}
