// 기상 경고의 판단 근거 종류 표시: 법령 / 현장 기준(법령 아님) / 참고
import type { WeatherAlert } from "../../shared/types";

const TONE: Record<NonNullable<WeatherAlert["basis"]>, string> = {
  "법령": "bg-red-100 text-red-800", "현장 기준": "bg-amber-100 text-amber-800", "참고": "bg-slate-100 text-slate-600",
};

export default function BasisTag({ basis }: { basis: NonNullable<WeatherAlert["basis"]> }) {
  return <span className={`mr-1 rounded px-1 py-px align-middle text-[11px] font-semibold ${TONE[basis]}`}>{basis}</span>;
}
