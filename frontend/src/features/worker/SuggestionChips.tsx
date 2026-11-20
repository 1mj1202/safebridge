// 입력창 위 추천 버튼: 👍 이해했어요 · ⚠ 위험 신고
export default function SuggestionChips({ understood, report, onUnderstood, onReport }: {
  understood?: string; report: string; onUnderstood?: () => void; onReport: () => void }) {
  const chip = "shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold active:bg-slate-100";
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {understood && onUnderstood && <button onClick={onUnderstood} className={chip}>👍 {understood}</button>}
      <button onClick={onReport} className={chip}>⚠ {report}</button>
    </div>
  );
}
