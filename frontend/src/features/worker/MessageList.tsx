// 대화 목록: 챗봇 글은 바탕 없이, 내 말은 오른쪽 회색 말풍선, 긴급은 빨간 칸, 전달 ✓, 반장 회신 👷
import type { ChatMsg } from "./fieldTypes";

function style(m: ChatMsg): string {
  if (m.tone === "urgent") return "rounded-2xl bg-red-600 p-3 font-bold text-white";
  if (m.from === "me") return "ml-auto max-w-[85%] rounded-3xl bg-slate-100 px-4 py-2.5";
  if (m.from === "lead") return "border-l-4 border-emerald-500 pl-3";
  return "";
}

export default function MessageList({ msgs, big }: { msgs: ChatMsg[]; big: boolean }) {
  return (
    <>
      {msgs.map((m) => (
        <p key={m.id} className={`w-fit whitespace-pre-wrap ${big ? "text-xl" : "text-base"} ${style(m)}`}>
          {m.from === "lead" && "👷 "}{m.text}
        </p>
      ))}
    </>
  );
}
