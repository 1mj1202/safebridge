// 홈 화면 숫자 칸 (누르면 그 메뉴로)
export default function Stat({ label, value, sub, tone = "slate", onClick }: {
  label: string; value: string; sub?: string; tone?: "slate" | "red" | "green"; onClick?: () => void }) {
  const color = tone === "red" ? "text-red-600" : tone === "green" ? "text-emerald-600" : "text-slate-900";
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      className="flex flex-1 flex-col items-start rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-slate-200 enabled:active:bg-slate-50">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      {sub && <span className="text-[11px] text-slate-400">{sub}</span>}
    </button>
  );
}
