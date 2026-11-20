// + 버튼 → 아래에서 올라오는 선택 창: 💬 질문 / ⚠ 문제 알리기
export type Mode = "ask" | "issue";

export default function ModeSheet({ open, mode, labels, onPick, onClose }: {
  open: boolean; mode: Mode; labels: Record<Mode, string>; onPick: (m: Mode) => void; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-30" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/40" aria-label="close" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-md flex-col gap-1 rounded-t-3xl bg-white p-4 pb-6">
        <span className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-300" />
        {(["ask", "issue"] as const).map((m) => (
          <button key={m} onClick={() => { onPick(m); onClose(); }} aria-pressed={mode === m}
            className={`rounded-2xl px-4 py-4 text-left text-lg ${mode === m ? "bg-slate-100 font-bold" : ""}`}>
            {m === "ask" ? "💬" : "⚠"} {labels[m]}</button>
        ))}
      </div>
    </div>
  );
}
