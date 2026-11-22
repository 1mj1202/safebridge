// 구역 고르기 (구역 QR·NFC 로 들어오면 건너뜀, 직접 고르기도 유지) — 출입 통제 구역은 회색
import { Ban, MapPin, Nfc } from "lucide-react";
import type { ZoneRow } from "./fieldTypes";

export default function ZonePicker({ greet, zones, onPick, nfc }: {
  greet: string; zones: ZoneRow[]; onPick: (z: string) => void;
  nfc: { supported: boolean; active: boolean; start: () => void } }) {
  return (
    <div className="mx-auto min-h-screen max-w-md space-y-3 bg-white p-5 pt-10">
      <p className="mb-4 text-xl">{greet}</p>
      {nfc.supported && (
        <button onClick={nfc.start} disabled={nfc.active}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-3 text-base font-semibold text-white disabled:bg-brand-400">
          <Nfc size={18} strokeWidth={1.75} /> NFC {nfc.active ? "…" : ""}</button>
      )}
      {zones.map((z) => (
        <button key={z.zone} onClick={() => onPick(z.zone)}
          className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-base font-medium active:bg-slate-100 ${z.restricted ? "border-slate-100 text-slate-400" : "border-slate-200"}`}>
          {z.restricted ? <Ban size={18} strokeWidth={1.75} /> : <MapPin size={18} strokeWidth={1.75} className="text-slate-500" />}{z.label}
        </button>
      ))}
    </div>
  );
}
