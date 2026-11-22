// 내 구역 보기 (브리핑 맨 위, 기본 3D): 3D 모델 ↔ 평면도. 두 보기 모두 위험 위치에서 예방 영상(3D 사고 재현)이 주기적으로 자동 재생된다
// (사용자 결정 2026-11-22 — 따로 있던 '예방 영상' 버튼은 없앰). three.js 는 3D 를 열 때만 받는다
import { useState } from "react";
import FloorPlan, { type Plan } from "./FloorPlan";
import SimPlayer, { type Sim } from "../sim/SimPlayer";
import ReplayFrame from "./ReplayFrame";
import Zone3D from "./Zone3D";
import { canWebGL } from "./webgl";

export type Mode = "3d" | "2d";

export default function ZoneView({ token, zone, plan, video, captions, sims = [], first = "3d" }: {
  token: string; zone: string; plan: Plan | null; video: string; captions: string[]; sims?: Sim[];
  /** 처음 보여 줄 보기 — 기본은 3D 모델 */
  first?: Mode }) {
  const webgl = canWebGL();
  const hasSim = webgl && sims.length > 0;
  const [mode, setMode] = useState<Mode>(!webgl || (first === "2d" && plan) ? "2d" : "3d");
  if (!webgl && !plan) return null;
  const modes: Mode[] = ["3d", ...(plan ? ["2d" as const] : [])];
  const name = { "3d": "3D", "2d": "2D" };
  return (
    <div>
      {webgl && modes.length > 1 && (
        <div className="mb-1 flex justify-end gap-1" role="group" aria-label="view">
          {modes.map((m) => (
            <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m}
              className={`rounded-full px-3 py-1 text-xs font-bold ${mode === m ? "bg-brand-600 text-white" : "bg-slate-100"}`}>
              {name[m]}</button>
          ))}
        </div>
      )}
      {hasSim ? <SimPlayer key={mode} sims={sims} label={video} token={token} zone={zone} backdrop={mode} plan={plan} />
        : mode === "3d" && webgl
          ? <ReplayFrame captions={captions}>{() => <Zone3D token={token} zone={zone} />}</ReplayFrame>
          : plan && <FloorPlan plan={plan} />}
    </div>
  );
}
