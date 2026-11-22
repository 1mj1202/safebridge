// 브리핑 끝의 사진 증빙 요청: "개구부 덮개 사진 1장" + 카메라 버튼
import { Camera } from "lucide-react";

export default function PhotoRequest({ text, label, done, busy, onShoot }: {
  text: string; label: string; done: boolean; busy: boolean; onShoot: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
      <Camera size={20} strokeWidth={1.75} className="shrink-0 text-slate-500" />
      <span className="flex-1">{text}</span>
      <button onClick={onShoot} disabled={busy}
        className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold ${done ? "bg-slate-100 text-slate-600" : "bg-brand-600 text-white"} disabled:opacity-50`}>
        {label}</button>
    </div>
  );
}
