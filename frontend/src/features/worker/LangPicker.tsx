// 첫 화면: 언어 고르기 — 기본 5개 언어, 나머지는 펼쳐서 고른다
import { ChevronDown, Globe } from "lucide-react";
import { useState } from "react";
import { splitLangs } from "../../shared/langs";

export default function LangPicker({ langs, onPick }: { langs: Record<string, string>; onPick: (l: string) => void }) {
  const [open, setOpen] = useState(false);
  const { main, more } = splitLangs(Object.keys(langs));
  const btn = (k: string) => (
    <button key={k} onClick={() => onPick(k)}
      className="rounded-full border border-slate-200 py-4 text-lg font-medium active:bg-slate-100">{langs[k]}</button>
  );
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 bg-white p-6">
      <Globe size={36} strokeWidth={1.5} className="mx-auto mb-4 text-slate-400" aria-hidden />
      {main.map(btn)}
      {more.length > 0 && !open && (
        <button onClick={() => setOpen(true)} aria-expanded={open} className="flex items-center justify-center gap-1 py-2 text-sm text-slate-500"><ChevronDown size={16} />+{more.length}</button>
      )}
      {open && more.map(btn)}
    </div>
  );
}
