// '오늘 적용할 대책'에 목록에 없는 대책을 직접 써서 추가하는 한 줄 입력칸
import { Plus } from "lucide-react";
import { useState } from "react";

export default function MeasureAdd({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  const add = () => {
    const t = text.trim();
    if (!t) return;
    onAdd(t);
    setText("");
  };
  return (
    <div className="mt-2 flex gap-1">
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="대책 직접 추가"
        aria-label="대책 직접 추가" className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
        onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); add(); } }} />
      <button type="button" onClick={add} disabled={!text.trim()}
        className="flex items-center gap-1 rounded border border-slate-300 px-2 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-40">
        <Plus size={12} />추가
      </button>
    </div>
  );
}
