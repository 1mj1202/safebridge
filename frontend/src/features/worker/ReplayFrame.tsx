// 예방 영상(BIM 재현) 틀: 소리 없이 반복 · 자막이 차례로 바뀜 · 누르면 전체 화면
import { Maximize2, Play, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

function useCycle(n: number, ms = 3500): number {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (n < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % n), ms);
    return () => clearInterval(t);
  }, [n, ms]);
  return n ? i % n : 0;
}

export default function ReplayFrame({ label, captions, children }: {
  label: string; captions: string[]; children: (full: boolean) => ReactNode }) {
  const [full, setFull] = useState(false);
  const i = useCycle(captions.length);
  const caption = captions[i];
  const overlay = (
    <>
      <span className="pointer-events-none absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">
        <Play size={12} fill="currentColor" />{label}</span>
      {caption && (
        <p key={i} className="pointer-events-none absolute inset-x-3 bottom-3 rounded-lg bg-black/65 px-3 py-2 text-center text-sm text-white">
          {caption}</p>
      )}
    </>
  );
  if (full) {
    return (
      <>
        <div className="flex h-64 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><Play size={28} /></div>
        <div className="fixed inset-0 z-40 bg-slate-100" role="dialog" aria-modal="true">
          <div className="absolute inset-0 touch-none">{children(true)}</div>
          {overlay}
          <button onClick={() => setFull(false)} aria-label="close"
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white"><X size={20} /></button>
        </div>
      </>
    );
  }
  return (
    <div className="relative h-64 touch-none">
      {children(false)}
      {overlay}
      <button onClick={() => setFull(true)} aria-label="fullscreen"
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white"><Maximize2 size={15} /></button>
    </div>
  );
}
