// 4D 날짜 슬라이더 — 공정 기간 안에서 날짜를 옮기면 3D 공정 상태·위험 영역이 바뀐다
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, daysBetween, label } from "./dates";

interface Props { start: string; end: string; value: string; today: string; onChange: (d: string) => void }

export default function DateSlider({ start, end, value, today, onChange }: Props) {
  const max = daysBetween(start, end);
  const idx = Math.min(Math.max(daysBetween(start, value), 0), max);
  const todayIdx = daysBetween(start, today);
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
      <div className="mb-1 flex items-center justify-between text-sm">
        <button className="rounded px-2 py-1 hover:bg-slate-100" onClick={() => onChange(addDays(value, -1))}
          disabled={idx <= 0} aria-label="이전 날"><ChevronLeft size={18} /></button>
        <strong className="text-slate-900">{label(value, today)}</strong>
        <button className="rounded px-2 py-1 hover:bg-slate-100" onClick={() => onChange(addDays(value, 1))}
          disabled={idx >= max} aria-label="다음 날"><ChevronRight size={18} /></button>
      </div>
      <div className="relative">
        <input type="range" min={0} max={max} value={idx} className="w-full accent-brand-600"
          aria-label="작업 날짜" onChange={(e) => onChange(addDays(start, Number(e.target.value)))} />
        {todayIdx >= 0 && todayIdx <= max && (
          <span className="pointer-events-none absolute -bottom-3 text-[10px] text-slate-500"
            style={{ left: `calc(${(todayIdx / max) * 100}% - 8px)` }}>오늘</span>
        )}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-slate-400"><span>{start}</span><span>{end}</span></div>
    </div>
  );
}
