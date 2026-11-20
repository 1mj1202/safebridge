// 입력창 위 추천 버튼: 이해했어요 · 위험 신고
import { Check, TriangleAlert } from "lucide-react";

export default function SuggestionChips({ understood, report, onUnderstood, onReport }: {
  understood?: string; report: string; onUnderstood?: () => void; onReport: () => void }) {
  const chip = "flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 active:bg-slate-100";
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {understood && onUnderstood && (
        <button onClick={onUnderstood} className={chip}><Check size={16} strokeWidth={2} className="text-emerald-600" />{understood}</button>
      )}
      <button onClick={onReport} className={chip}><TriangleAlert size={16} strokeWidth={2} className="text-orange-600" />{report}</button>
    </div>
  );
}
