// 3D 장면 구성 규칙 (three.js 와 무관한 순수 함수 — 단위 테스트 대상)
import type { Vec3, Zone } from "../../shared/types";

export type Status = "done" | "active" | "planned" | undefined;

export const STATUS_STYLE: Record<"done" | "active" | "planned" | "none", { color: number; opacity: number }> = {
  done: { color: 0x94a3b8, opacity: 1 },
  active: { color: 0x3b82f6, opacity: 0.85 },
  planned: { color: 0xe2e8f0, opacity: 0.12 },
  none: { color: 0xcbd5e1, opacity: 0.3 },
};

export const ZONE_COLOR = { fall: 0xdc2626, drop: 0xf97316 } as const;

export function statusStyle(s: Status) {
  return STATUS_STYLE[s ?? "none"];
}

/** 영역 박스 중심·크기 (두께 0 인 영역은 최소 두께를 준다) */
export function zoneBox(z: Pick<Zone, "min" | "max">, minThickness = 0.05): { center: Vec3; size: Vec3 } {
  const size = [0, 1, 2].map((i) => Math.max(z.max[i] - z.min[i], minThickness)) as Vec3;
  const center = [0, 1, 2].map((i) => (z.min[i] + z.max[i]) / 2) as Vec3;
  return { center, size };
}

/** IFC(Z 위) → three.js(Y 위) 좌표 */
export function ifcToThree([x, y, z]: Vec3): Vec3 {
  return [x, z, -y];
}

/** 영역을 구역별로 묶기: 같은 위험(종류+라벨 접두)끼리 */
export function groupZones(zones: Zone[]): { key: string; kind: Zone["kind"]; label: string; zones: Zone[] }[] {
  const groups = new Map<string, { key: string; kind: Zone["kind"]; label: string; zones: Zone[] }>();
  for (const z of zones) {
    const key = z.id.includes("-EDGE-") ? `${z.storey}-edge` : z.id.includes("-GROUND-") ? `${z.storey}-ground` : z.id;
    const label = z.id.includes("-EDGE-") ? `${z.storey} 슬래브 단부 추락` : z.id.includes("-GROUND-")
      ? "외곽 지상 낙하(통행 통제)" : z.label;
    if (!groups.has(key)) groups.set(key, { key, kind: z.kind, label, zones: [] });
    groups.get(key)!.zones.push(z);
  }
  return [...groups.values()];
}

export const FOCUS_COLOR = 0x16a34a; // 진행 중 부재(파랑)와 구분되는 초록

/** 내 구역이 잘 보이는 카메라: 구역 중심을 보고, 남서쪽 위에서 구역 크기에 맞춘 거리 */
export function focusCamera(b: Pick<Zone, "min" | "max">): { target: Vec3; position: Vec3 } {
  const { center, size } = zoneBox(b);
  const t = ifcToThree(center);
  const d = Math.max(size[0], size[1], 8) * 2.1;
  return { target: t, position: [t[0] - d * 0.6, t[1] + d * 0.8, t[2] + d] };
}

export const PEOPLE_COLOR = 0x059669; // 근로자 인원 배지(초록)

/** 인원 배지 자리: 구역 상자 윗면 가운데 조금 위 (three 좌표) */
export function markerPosition(b: Pick<Zone, "min" | "max">): Vec3 {
  const { center } = zoneBox(b);
  return ifcToThree([center[0], center[1], b.max[2] + 1.2]);
}
