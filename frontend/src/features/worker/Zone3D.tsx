// 실제 건물 3D(BIM): 내 구역 초록 + 추락 빨강·낙하 주황 영역, 천천히 돌며 위험 영역이 깜빡인다
// hazard 를 주면 그 위험 종류의 영역만 강조하고 카메라를 그쪽으로 (예방 영상의 '위험 구역 짚기')
import { lazy, Suspense, useMemo } from "react";
import { useFetch } from "../../shared/hooks";
import type { BimModel, Vec3, Zone } from "../../shared/types";
import type { SimKind } from "../sim/scenarios";
import type { Status } from "../viewer/scene";

const Viewer3D = lazy(() => import("../viewer/Viewer3D"));

interface Scene { focus: { min: Vec3; max: Vec3 } | null; element_status: Record<string, Status>; zones: Zone[] }

/** 위험 종류 → 3D 위험 영역 (붕괴는 영역이 없어 내 구역 전체) */
export function zonesOfKind(zones: Zone[], kind: SimKind): Zone[] {
  if (kind === "fall_edge") return zones.filter((z) => z.kind === "fall" && z.id.includes("-EDGE-"));
  if (kind === "fall_opening") return zones.filter((z) => z.kind === "fall" && z.id.includes("-OPN-"));
  if (kind === "falling_object") return zones.filter((z) => z.kind === "drop");
  return [];
}

/** 여러 상자를 감싸는 상자 */
export function unionBox(bs: { min: Vec3; max: Vec3 }[]): { min: Vec3; max: Vec3 } | null {
  if (!bs.length) return null;
  const min = [0, 1, 2].map((i) => Math.min(...bs.map((b) => b.min[i]))) as Vec3;
  const max = [0, 1, 2].map((i) => Math.max(...bs.map((b) => b.max[i]))) as Vec3;
  return { min, max };
}

export default function Zone3D({ token, zone, hazard = null }: { token: string; zone: string; hazard?: SimKind | null }) {
  const { data: model } = useFetch<BimModel>("/bim/model");
  const { data: scene } = useFetch<Scene>(`/w/${token}/scene?zone=${encodeURIComponent(zone)}`);
  const picked = useMemo(() => (scene && hazard ? zonesOfKind(scene.zones, hazard) : []), [scene, hazard]);
  const aim = useMemo(() => (hazard ? unionBox(picked) ?? scene?.focus ?? null : null), [hazard, picked, scene]);
  if (!model || !scene) return <div className="flex h-full items-center justify-center text-slate-400">3D …</div>;
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-slate-400">3D …</div>}>
      <Viewer3D model={model} status={scene.element_status} zones={scene.zones} selected={picked.map((z) => z.id)}
        focus={scene.focus} aim={aim} replay />
    </Suspense>
  );
}
