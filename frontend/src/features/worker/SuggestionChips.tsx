// 입력창 위 버튼: '이해했어요'는 화면 폭 전체의 주 버튼(교육 확인의 핵심 동작), '위험 신고'는 보조 칩
import { Check, TriangleAlert } from "lucide-react";

export default function SuggestionChips({ understood, report, onUnderstood, onReport }: {
  understood?: string; report: string; onUnderstood?: () => void; onReport: () => void }) {
  const chip = "flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 active:bg-slate-100";
  return (
    <div className="space-y-2 pb-2">
      {understood && onUnderstood && (
        <button onClick={onUnderstood}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-lg font-bold text-white shadow-md active:bg-emerald-700">
          <Check size={22} strokeWidth={3} />{understood}
        </button>
      )}
      <div className="flex gap-2 overflow-x-auto">
        <button onClick={onReport} className={chip}><TriangleAlert size={16} strokeWidth={2} className="text-orange-600" />{report}</button>
      </div>
    </div>
  );
}
