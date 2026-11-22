// 일할 곳 평면도 — 작업 층 슬래브·개구부·위험 영역 (3D 라이브러리 없이 SVG)
// hazard 를 주면 그 위험 위치만 빨갛게 깜빡인다 (예방 영상의 '위험 구역 짚기', 붕괴는 슬래브 전체)
import type { SimKind } from "../sim/scenarios";

export interface Plan {
  storey: string;
  bounds: [number, number, number, number];
  openings: [number, number, number, number][];
  zones: { kind: "fall" | "drop"; rect: [number, number, number, number] }[];
}

type Rect = [number, number, number, number];

/** 위험 종류 → 평면도에서 짚을 자리 */
export function planSpots(plan: Plan, hazard: SimKind | null): Rect[] {
  if (!hazard) return [];
  if (hazard === "fall_opening") return plan.openings;
  if (hazard === "fall_edge") return plan.zones.filter((z) => z.kind === "fall").map((z) => z.rect);
  if (hazard === "falling_object") return plan.zones.filter((z) => z.kind === "drop").map((z) => z.rect);
  return [plan.bounds];
}

export default function FloorPlan({ plan, hazard = null, fill = false }: { plan: Plan; hazard?: SimKind | null; fill?: boolean }) {
  const [x0, , , y1] = plan.bounds;
  const pad = 1.5;
  const W = plan.bounds[2] - x0 + pad * 2, H = y1 - plan.bounds[1] + pad * 2;
  // SVG y 는 아래로 증가 → 북쪽(큰 y)이 위로 오게 뒤집는다
  const r = ([a, b, c, d]: number[]) => ({ x: a - x0 + pad, y: y1 - d + pad, width: c - a, height: d - b });
  const spots = planSpots(plan, hazard);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
      className={`w-full rounded-lg bg-slate-100 ${fill ? "h-full" : ""}`} role="img" aria-label={`${plan.storey} 평면`}>
      <rect {...r(plan.bounds)} fill="#cbd5e1" stroke="#475569" strokeWidth="0.2" />
      {/* 짚는 동안은 나머지를 흐리게 */}
      <g opacity={hazard ? 0.35 : 1}>
        {plan.zones.map((z, i) => (
          <rect key={i} {...r(z.rect)} fill={z.kind === "fall" ? "#dc2626" : "#f97316"} opacity={0.75} />
        ))}
        {plan.openings.map((o, i) => (
          <rect key={i} {...r(o)} fill="#0f172a" stroke="#facc15" strokeWidth="0.3" strokeDasharray="0.6 0.4" />
        ))}
      </g>
      {spots.map((s, i) => (
        <rect key={`h${i}`} {...r(s)} fill="#dc2626" fillOpacity={0.35} stroke="#dc2626" strokeWidth="0.5" data-testid="plan-hazard">
          <animate attributeName="fill-opacity" values="0.15;0.6;0.15" dur="1.2s" repeatCount="indefinite" />
        </rect>
      ))}
      <text x={W - 1} y={1.8} textAnchor="end" fontSize="1.4" fill="#475569">N ↑</text>
    </svg>
  );
}
