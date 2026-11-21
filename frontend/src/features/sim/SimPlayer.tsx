// 근로자 화면 예방 영상: 3D 사고 재현 + 자막(사고 장면은 빨강 경고, 대책 장면은 초록 방패). 누르면 전체 화면
import { ShieldCheck, TriangleAlert } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import ReplayFrame from "../worker/ReplayFrame";
import type { Phase } from "./motion";
import type { SimKind } from "./scenarios";

const AccidentSim = lazy(() => import("./AccidentSim"));

export interface Sim { kind: SimKind; accident: string; measure: string }

export default function SimPlayer({ sims, label }: { sims: Sim[]; label: string }) {
  const [step, setStep] = useState<{ index: number; phase: Phase }>({ index: 0, phase: "accident" });
  const s = sims[step.index] ?? sims[0];
  const danger = step.phase === "accident";
  const caption = s && (
    <span className="flex items-center justify-center gap-1.5">
      {danger ? <TriangleAlert size={16} className="shrink-0 text-red-400" /> : <ShieldCheck size={16} className="shrink-0 text-emerald-400" />}
      {danger ? s.accident : s.measure}
    </span>
  );
  return (
    <ReplayFrame label={label} caption={caption} captionKey={`${step.index}-${step.phase}`}
      tone={danger ? "danger" : "safe"}>
      {() => (
        <Suspense fallback={<div className="flex h-full items-center justify-center text-slate-400">3D …</div>}>
          <AccidentSim kinds={sims.map((x) => x.kind)} onStep={(index, phase) => setStep({ index, phase })} />
        </Suspense>
      )}
    </ReplayFrame>
  );
}
