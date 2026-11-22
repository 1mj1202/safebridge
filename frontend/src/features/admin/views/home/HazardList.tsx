// 오늘 위험 상위 3개 — 빨간 온점 + 위험도
import type { DraftItem } from "../../../../shared/types";

export default function HazardList({ items }: { items: DraftItem[] }) {
  if (!items.length) return <p className="text-sm text-slate-400">아직 정리된 위험이 없어요.</p>;
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.id} className="flex items-center gap-2 text-[15px]">
          <span aria-hidden className="w-4 text-center font-bold text-red-600">•</span>
          <span className="min-w-0 flex-1 truncate">{i.hazard}</span>
          <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${
            i.level === "상" ? "bg-red-100 text-red-700" : i.level === "중" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"}`}>
            {i.level}</span>
        </li>
      ))}
    </ul>
  );
}
