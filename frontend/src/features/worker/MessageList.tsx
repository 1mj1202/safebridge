// 대화 목록: 챗봇 글은 바탕 없이, 내 말은 오른쪽 회색 말풍선, 긴급은 빨간 칸, 전달 확인, 반장 회신(초록 선)
import { CheckCheck, HardHat } from "lucide-react";
import type { ChatMsg } from "./fieldTypes";

function style(m: ChatMsg): string {
  if (m.tone === "urgent") return "rounded-2xl bg-red-600 p-3 font-semibold text-white";
  if (m.from === "me" && m.image) return "ml-auto max-w-[70%]";
  if (m.from === "me") return "ml-auto max-w-[85%] rounded-3xl bg-slate-100 px-4 py-2.5";
  if (m.from === "lead") return "border-l-2 border-emerald-500 pl-3";
  if (m.tone === "sent") return "text-sm text-slate-500";
  return "";
}

export default function MessageList({ msgs, big }: { msgs: ChatMsg[]; big: boolean }) {
  return (
    <>
      {msgs.map((m) => (
        <div key={m.id} className={`flex w-fit items-start gap-2 whitespace-pre-wrap ${big ? "text-xl" : "text-base"} ${style(m)}`}>
          {m.from === "lead" && <HardHat size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-emerald-600" />}
          {m.tone === "sent" && <CheckCheck size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-emerald-600" />}
          {m.image ? <img src={m.image} alt="" className="max-h-48 rounded-2xl" /> : <span>{m.text}</span>}
        </div>
      ))}
    </>
  );
}
