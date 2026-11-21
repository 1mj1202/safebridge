// 입력창 위 버튼: '이해했어요'는 화면 폭 전체의 주 버튼(교육 확인의 핵심 동작), '위험 신고'는 보조 칩
// 실수로 눌러도 바로 집계되지 않게 한 번 더 묻는다(같은 자리에서 '이해했어요 / 다시 볼게요')
import { Check, TriangleAlert } from "lucide-react";
import { useState } from "react";

interface Props {
  understood?: string;
  /** 확인 질문·취소 문구 (근로자 언어). 없으면 한국어 */
  confirm?: { q?: string; back?: string };
  report: string;
  onUnderstood?: () => void;
  onReport: () => void;
}

export default function SuggestionChips({ understood, confirm, report, onUnderstood, onReport }: Props) {
  const [asking, setAsking] = useState(false);
  const chip = "flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 active:bg-slate-100";
  const show = understood && onUnderstood;
  return (
    <div className="space-y-2 pb-2">
      {show && !asking && (
        <button onClick={() => setAsking(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-lg font-bold text-white shadow-md active:bg-emerald-700">
          <Check size={22} strokeWidth={3} />{understood}
        </button>
      )}
      {show && asking && (
        <div role="alertdialog" aria-label={confirm?.q ?? "오늘 안내를 모두 이해했나요?"}
          className="rounded-xl border-2 border-emerald-600 bg-white p-3 shadow-md">
          <p className="mb-2 text-center text-base font-semibold text-slate-800">{confirm?.q ?? "오늘 안내를 모두 이해했나요?"}</p>
          <div className="flex gap-2">
            <button onClick={() => setAsking(false)}
              className="flex-1 rounded-lg border border-slate-300 py-3 text-base font-medium text-slate-700 active:bg-slate-100">
              {confirm?.back ?? "다시 볼게요"}</button>
            <button onClick={() => { setAsking(false); onUnderstood!(); }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-3 text-base font-bold text-white active:bg-emerald-700">
              <Check size={18} strokeWidth={3} />{understood}</button>
          </div>
        </div>
      )}
      <div className="flex gap-2 overflow-x-auto">
        <button onClick={onReport} className={chip}><TriangleAlert size={16} strokeWidth={2} className="text-orange-600" />{report}</button>
      </div>
    </div>
  );
}
