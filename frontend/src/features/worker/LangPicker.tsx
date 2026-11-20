// 첫 화면: 언어 고르기 — 기본 5개 언어, 나머지는 ▼ 를 눌러 펼친다
import { useState } from "react";
import { splitLangs } from "../../shared/langs";

export default function LangPicker({ langs, onPick }: { langs: Record<string, string>; onPick: (l: string) => void }) {
  const [open, setOpen] = useState(false);
  const { main, more } = splitLangs(Object.keys(langs));
  const btn = (k: string) => (
    <button key={k} onClick={() => onPick(k)}
      className="rounded-full border border-slate-200 py-4 text-xl font-semibold active:bg-slate-100">{langs[k]}</button>
  );
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 bg-white p-6">
      <p className="mb-3 text-center text-4xl" aria-hidden>🌐</p>
      {main.map(btn)}
      {more.length > 0 && !open && (
        <button onClick={() => setOpen(true)} aria-expanded={open} className="py-2 text-slate-500">▼ +{more.length}</button>
      )}
      {open && more.map(btn)}
    </div>
  );
}
