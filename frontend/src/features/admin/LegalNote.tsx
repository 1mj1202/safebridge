// 긴 법령 설명 문단은 접어 두고 '법령 근거'를 눌렀을 때만 보여 준다
export default function LegalNote({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <details className="mt-0.5 text-xs text-slate-500">
      <summary className="cursor-pointer select-none text-slate-400 hover:text-slate-600">법령 근거</summary>
      <p className="mt-0.5">{text}</p>
    </details>
  );
}
