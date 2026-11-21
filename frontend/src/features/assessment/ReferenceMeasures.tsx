// 참고: 유사사례 원문 대책 중 오늘 작업 단계·장비와 조건이 다른 것 (접힌 상태, 사례 원문으로 연결)
export default function ReferenceMeasures({ refs, onCase }: {
  refs: { text: string; case_id: string; reason: string }[]; onCase: (id: string) => void }) {
  return (
    <details className="mt-1 rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">
      <summary className="cursor-pointer select-none">참고: 조건이 다른 유사사례 대책 {refs.length}건 (오늘 적용 대상 아님)</summary>
      <ul className="mt-1 space-y-1">
        {refs.map((r) => (
          <li key={r.text}>
            <span className="mr-1 rounded bg-slate-200 px-1">{r.reason}</span>{r.text}
            <button type="button" className="ml-1 text-amber-700 underline" onClick={() => onCase(r.case_id)}>사례 {r.case_id}</button>
          </li>
        ))}
      </ul>
    </details>
  );
}
