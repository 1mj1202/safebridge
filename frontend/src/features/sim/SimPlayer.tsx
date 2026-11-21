// 근로자 화면 예방 영상: 위험마다 '실제 건물 3D 에서 위험 구역 짚기 → 3D 사고 재현 → 대책 장면'
// 자막: 짚기는 위치 표시, 사고는 빨강 경고, 대책은 초록 방패. 누르면 전체 화면
import { MapPin, ShieldCheck, TriangleAlert } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import ReplayFrame from "../worker/ReplayFrame";
import Zone3D from "../worker/Zone3D";
import type { Phase } from "./motion";
import type { SimKind } from "./scenarios";

const AccidentSim = lazy(() => import("./AccidentSim"));

export interface Sim { kind: SimKind; accident: string; measure: string }

const loading = <div className="flex h-full items-center justify-center text-slate-400">3D …</div>;

export default function SimPlayer({ sims, label, token, zone }: { sims: Sim[]; label: string; token: string; zone: string }) {
  const [step, setStep] = useState<{ index: number; phase: Phase }>({ index: 0, phase: "intro" });
  const s = sims[step.index] ?? sims[0];
  const { phase } = step;
  const Icon = phase === "intro" ? MapPin : phase === "accident" ? TriangleAlert : ShieldCheck;
  const caption = s && (
    <span className="flex items-center justify-center gap-1.5">
      <Icon size={16} className={`shrink-0 ${phase === "measure" ? "text-emerald-300" : phase === "accident" ? "text-red-300" : "text-amber-300"}`} />
      {phase === "measure" ? s.measure : s.accident}
    </span>
  );
  return (
    <ReplayFrame label={label} caption={caption} captionKey={`${step.index}-${phase}`}
      tone={phase === "accident" ? "danger" : phase === "measure" ? "safe" : undefined}>
      {() => (
        <div className="absolute inset-0">
          <Suspense fallback={loading}>
            <AccidentSim kinds={sims.map((x) => x.kind)} onStep={(index, p) => setStep({ index, phase: p })} />
          </Suspense>
          {/* 실제 건물 3D: 짚기 장면에서만 보이고, 나머지 때는 숨겨 둔다(다시 불러오지 않게) */}
          <div className={`absolute inset-0 transition-opacity duration-500 ${phase === "intro" ? "opacity-100" : "pointer-events-none opacity-0"}`}>
            <Zone3D token={token} zone={zone} hazard={s?.kind ?? null} />
          </div>
        </div>
      )}
    </ReplayFrame>
  );
}
