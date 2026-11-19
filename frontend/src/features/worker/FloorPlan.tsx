// 일할 곳 평면도 — 작업 층 슬래브·개구부·위험 영역 (3D 라이브러리 없이 SVG)
export interface Plan {
  storey: string;
  bounds: [number, number, number, number];
  openings: [number, number, number, number][];
  zones: { kind: "fall" | "drop"; rect: [number, number, number, number] }[];
}

export default function FloorPlan({ plan }: { plan: Plan }) {
  const [x0, y0, x1, y1] = plan.bounds;
  const pad = 1.5;
  const W = x1 - x0 + pad * 2, H = y1 - y0 + pad * 2;
  // SVG y 는 아래로 증가 → 북쪽(큰 y)이 위로 오게 뒤집는다
  const r = ([a, b, c, d]: number[]) => ({ x: a - x0 + pad, y: y1 - d + pad, width: c - a, height: d - b });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg bg-slate-100" role="img" aria-label={`${plan.storey} 평면`}>
      <rect {...r(plan.bounds)} fill="#cbd5e1" stroke="#475569" strokeWidth="0.2" />
      {plan.zones.map((z, i) => (
        <rect key={i} {...r(z.rect)} fill={z.kind === "fall" ? "#dc2626" : "#f97316"} opacity={0.75} />
      ))}
      {plan.openings.map((o, i) => (
        <rect key={i} {...r(o)} fill="#0f172a" stroke="#facc15" strokeWidth="0.3" strokeDasharray="0.6 0.4" />
      ))}
      <text x={W - 1} y={1.8} textAnchor="end" fontSize="1.4" fill="#475569">N ↑</text>
    </svg>
  );
}
