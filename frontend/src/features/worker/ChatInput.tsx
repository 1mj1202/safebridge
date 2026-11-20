// 입력창: 질문(챗봇이 브리핑 안에서 답) / 문제 알리기(반장·공사담당에게 번역 전달)
import { useState } from "react";
import { NO_PII } from "./messages";

export type Mode = "ask" | "issue";

export default function ChatInput({ lang, labels, hints, busy, onSend }: {
  lang: string; labels: Record<Mode, string>; hints: Record<Mode, string>; busy: boolean;
  onSend: (mode: Mode, text: string) => void }) {
  const [mode, setMode] = useState<Mode>("ask");
  const [text, setText] = useState("");
  const send = () => {
    if (!text.trim() || busy) return;
    onSend(mode, text.trim());
    setText("");
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {(["ask", "issue"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${mode === m ? (m === "issue" ? "bg-orange-600 text-white" : "bg-blue-600 text-white") : "bg-slate-100"}`}>
            {m === "ask" ? "💬" : "⚠"} {labels[m]}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={500}
          aria-label={labels[mode]} placeholder={hints[mode] || (mode === "issue" ? NO_PII[lang] : "")}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 p-2 text-lg" />
        <button onClick={send} disabled={busy || !text.trim()} aria-label="send"
          className="rounded-lg bg-slate-900 px-4 text-xl font-bold text-white disabled:opacity-40">{busy ? "…" : "➤"}</button>
      </div>
    </div>
  );
}
