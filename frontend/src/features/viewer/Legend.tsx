export default function Legend() {
  const items = [
    ["bg-slate-400", "시공 완료"], ["bg-blue-500", "진행 중"], ["bg-slate-200 ring-1 ring-slate-300", "미시공"],
    ["bg-red-600", "추락 위험"], ["bg-orange-500", "낙하 위험"], ["bg-emerald-600", "근로자 인원"],
  ];
  return (
    <div className="flex flex-wrap gap-3 rounded-lg bg-white/90 px-3 py-2 text-xs shadow">
      {items.map(([c, t]) => (
        <span key={t} className="flex items-center gap-1.5"><i className={`inline-block h-3 w-3 rounded-sm ${c}`} />{t}</span>
      ))}
    </div>
  );
}
