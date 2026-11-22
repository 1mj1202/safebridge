// 접어 두는 칸: '관련 예방 영상 3개 ▾', '3D·도면으로 구역 보기 ▾' — 펼칠 때만 안을 그린다(3D·영상은 무거움)
import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

export default function Fold({ label, icon, children }: { label: string; icon: ReactNode; children: () => ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[0.9em] font-medium text-slate-700">
        {icon}<span className="flex-1">{label}</span>
        <ChevronDown size={18} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t border-slate-100 p-2">{children()}</div>}
    </div>
  );
}
