// 첫 화면: 언어 고르기 — 기본 5개 언어, 나머지는 "다른 언어"를 눌러 펼친다
import { useState } from "react";
import { splitLangs } from "../../shared/langs";

export default function LangPicker({ langs, onPick }: { langs: Record<string, string>; onPick: (l: string) => void }) {
  const [open, setOpen] = useState(false);
  const { main, more } = splitLangs(Object.keys(langs));
  const btn = (k: string) => (
    <button key={k} onClick={() => onPick(k)}
      className="rounded-2xl bg-white py-5 text-2xl font-bold shadow ring-1 ring-slate-200 active:bg-slate-100">{langs[k]}</button>
  );
  return (
    <div className="mx-auto max-w-md p-5">
      <h1 className="mb-1 text-center text-2xl font-bold">SafeBridge</h1>
      <p className="mb-5 text-center text-slate-500">언어를 고르세요 · Choose your language</p>
      <div className="grid gap-3">
        {main.map(btn)}
        {more.length > 0 && (
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
            className="rounded-2xl py-3 text-lg font-semibold text-slate-600 ring-1 ring-dashed ring-slate-300">
            🌐 {open ? "▲" : "▼"} {more.map((k) => langs[k]).join(" · ")}</button>
        )}
        {open && more.map(btn)}
      </div>
    </div>
  );
}
