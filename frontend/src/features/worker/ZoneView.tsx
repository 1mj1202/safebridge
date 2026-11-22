// 내 구역 보기 (브리핑 맨 위, 기본 3D): 3D 모델 ↔ 예방 영상(3D 사고 재현)(내 구역 초록 + 추락 빨강·낙하 주황 영역) ↔ 평면도. three.js 는 3D 를 열 때만 받는다
import { useState } from "react";
import FloorPlan, { type Plan } from "./FloorPlan";
import SimPlayer, { type Sim } from "../sim/SimPlayer";
import ReplayFrame from "./ReplayFrame";
import Zone3D from "./Zone3D";
import { canWebGL } from "./webgl";

export type Mode = "sim" | "3d" | "2d";

export default function ZoneView({ token, zone, plan, video, captions, sims = [], first = "3d" }: {
  token: string; zone: string; plan: Plan | null; video: string; captions: string[]; sims?: Sim[];
  /** 처음 보여 줄 보기 — 기본은 3D 모델 (사용자 결정 2026-11-22), 예방 영상·평면도는 버튼으로 */
  first?: Mode }) {
  const webgl = canWebGL();
  const hasSim = webgl && sims.length > 0;
  const [mode, setMode] = useState<Mode>(!webgl ? "2d" : first === "sim" && !hasSim ? "3d" : first);
  if (!webgl && !plan) return null;
  const modes: Mode[] = ["3d", ...(hasSim ? ["sim" as const] : []), ...(plan ? ["2d" as const] : [])];
  const name = { sim: video, "3d": "3D", "2d": "2D" };
  return (
    <div>
      {webgl && (
        <div className="mb-1 flex justify-end gap-1" role="group" aria-label="view">
          {modes.map((m) => (
            <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m}
              className={`rounded-full px-3 py-1 text-xs font-bold ${mode === m ? "bg-slate-900 text-white" : "bg-slate-100"}`}>
              {name[m]}</button>
          ))}
        </div>
      )}
      {mode === "sim" && hasSim ? <SimPlayer sims={sims} label={video} token={token} zone={zone} />
        : mode === "3d" && webgl
          ? <ReplayFrame captions={captions}>{() => <Zone3D token={token} zone={zone} />}</ReplayFrame>
          : plan && <FloorPlan plan={plan} />}
    </div>
  );
}
