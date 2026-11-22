// 3D 위 층 버튼 (목업: 3F / 2F / 1F / 전체) — 고른 층까지만 보인다
export default function FloorButtons({ floors, value, onChange }: {
  floors: string[]; value: string | null; onChange: (f: string | null) => void }) {
  const btn = (on: boolean) => `rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
    on ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"}`;
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="층 선택">
      {floors.map((f) => <button key={f} type="button" className={btn(value === f)} aria-pressed={value === f}
        onClick={() => onChange(f)}>{f}</button>)}
      <button type="button" className={btn(value === null)} aria-pressed={value === null} onClick={() => onChange(null)}>전체</button>
    </div>
  );
}
