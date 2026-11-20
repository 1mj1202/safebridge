// 아래 입력창: + (질문/문제 알리기 선택) · 둥근 입력칸 · 보내기
import { useState } from "react";
import { NO_PII } from "./messages";
import ModeSheet, { type Mode } from "./ModeSheet";

export type { Mode };

export default function ChatInput({ lang, mode, onMode, labels, hints, busy, onSend }: {
  lang: string; mode: Mode; onMode: (m: Mode) => void; labels: Record<Mode, string>; hints: Record<Mode, string>;
  busy: boolean; onSend: (mode: Mode, text: string) => void }) {
  const [text, setText] = useState("");
  const [sheet, setSheet] = useState(false);
  const send = () => {
    if (!text.trim() || busy) return;
    onSend(mode, text.trim());
    setText("");
  };
  return (
    <>
      <div className={`flex items-end gap-2 rounded-[28px] border bg-white p-1.5 shadow-sm ${mode === "issue" ? "border-orange-400" : "border-slate-200"}`}>
        <button onClick={() => setSheet(true)} aria-label={labels[mode]}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl ${mode === "issue" ? "bg-orange-100" : "bg-slate-100"}`}>
          {mode === "issue" ? "⚠" : "+"}</button>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={500}
          aria-label={labels[mode]} placeholder={hints[mode] || (mode === "issue" ? NO_PII[lang] : "")}
          className="max-h-32 min-w-0 flex-1 resize-none bg-transparent py-2 text-base outline-none" />
        <button onClick={send} disabled={busy || !text.trim()} aria-label="send"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-lg text-white disabled:bg-slate-300">
          {busy ? "…" : "↑"}</button>
      </div>
      <ModeSheet open={sheet} mode={mode} labels={labels} onPick={onMode} onClose={() => setSheet(false)} />
    </>
  );
}
