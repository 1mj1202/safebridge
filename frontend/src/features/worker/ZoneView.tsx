// 내 구역 보기: 예방 영상(3D 사고 재현) ↔ 3D 모델(내 구역 초록 + 추락 빨강·낙하 주황 영역) ↔ 평면도. three.js 는 3D 를 열 때만 받는다
import { lazy, Suspense, useState } from "react";
import { useFetch } from "../../shared/hooks";
import type { BimModel, Vec3, Zone } from "../../shared/types";
import type { Status } from "../viewer/scene";
import FloorPlan, { type Plan } from "./FloorPlan";
import SimPlayer, { type Sim } from "../sim/SimPlayer";
import ReplayFrame from "./ReplayFrame";
import { canWebGL } from "./webgl";

const Viewer3D = lazy(() => import("../viewer/Viewer3D"));

interface Scene { focus: { min: Vec3; max: Vec3 } | null; element_status: Record<string, Status>; zones: Zone[] }

function Zone3D({ token, zone }: { token: string; zone: string }) {
  const { data: model } = useFetch<BimModel>("/bim/model");
  const { data: scene } = useFetch<Scene>(`/w/${token}/scene?zone=${encodeURIComponent(zone)}`);
  if (!model || !scene) return <div className="flex h-full items-center justify-center text-slate-400">3D …</div>;
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-slate-400">3D …</div>}>
      <Viewer3D model={model} status={scene.element_status} zones={scene.zones} selected={[]} focus={scene.focus} replay />
    </Suspense>
  );
}

type Mode = "sim" | "3d" | "2d";

export default function ZoneView({ token, zone, plan, video, captions, sims = [] }: {
  token: string; zone: string; plan: Plan | null; video: string; captions: string[]; sims?: Sim[] }) {
  const webgl = canWebGL();
  const hasSim = webgl && sims.length > 0;
  const [mode, setMode] = useState<Mode>(hasSim ? "sim" : webgl ? "3d" : "2d");
  if (!webgl && !plan) return null;
  const modes: Mode[] = [...(hasSim ? ["sim" as const] : []), "3d", ...(plan ? ["2d" as const] : [])];
  const name = { sim: video, "3d": "3D", "2d": "2D" };
  return (
    <div className="mt-3">
      {webgl && (
        <div className="mb-1 flex justify-end gap-1" role="group" aria-label="view">
          {modes.map((m) => (
            <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m}
              className={`rounded-full px-3 py-1 text-xs font-bold ${mode === m ? "bg-slate-900 text-white" : "bg-slate-100"}`}>
              {name[m]}</button>
          ))}
        </div>
      )}
      {mode === "sim" && hasSim ? <SimPlayer sims={sims} label={video} />
        : mode === "3d" && webgl
          ? <ReplayFrame captions={captions}>{() => <Zone3D token={token} zone={zone} />}</ReplayFrame>
          : plan && <FloorPlan plan={plan} />}
    </div>
  );
}
