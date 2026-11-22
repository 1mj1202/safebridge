// 관리자 화면을 열면 근로자 앱에 지금 나가는 발행본(/launch)과 그 위험성평가를 먼저 불러온다
// → 관리자와 근로자가 같은 승인본을 본다. 발행본이 없으면 가장 최근 위험성평가.
// 단, 발행본보다 나중에 만든 '아직 발행 전' 초안이 있으면 그 초안을 먼저 연다
// → 안전관리자가 새로 만든 초안을 현장소장이 바로 보고 승인할 수 있다.
import { useEffect } from "react";
import { api } from "../../shared/api";
import type { Assessment, Tbm } from "../../shared/types";

export interface AssessmentSummary { id: number; tbms: { id: number }[] }
export interface LiveTbm { tbm_id: number; assessment_id: number }

/** 처음 열 위험성평가: 발행 전인 더 새 초안 > 지금 발행본 > 가장 최근 위험성평가 */
export function pickRestore(live: LiveTbm | null, list: AssessmentSummary[]):
  { kind: "live"; live: LiveTbm } | { kind: "latest"; id: number } | null {
  const newest = list[0];
  if (live && !(newest && newest.id > live.assessment_id && newest.tbms.length === 0)) return { kind: "live", live };
  return newest ? { kind: "latest", id: newest.id } : null;
}

export function useRestore(onRestore: (a: Assessment, t: Tbm | null) => void) {
  useEffect(() => {
    let alive = true;
    (async () => {
      const [live, list] = await Promise.all([
        api.get<LiveTbm>("/launch").catch(() => null),
        api.get<AssessmentSummary[]>("/assessments").catch(() => [] as AssessmentSummary[]),
      ]);
      const pick = pickRestore(live, list);
      if (!pick) return;
      if (pick.kind === "live") {
        const [a, t] = await Promise.all([api.get<Assessment>(`/assessments/${pick.live.assessment_id}`),
          api.get<Tbm>(`/tbms/${pick.live.tbm_id}`)]);
        if (alive) onRestore(a, t);
        return;
      }
      const a = await api.get<Assessment>(`/assessments/${pick.id}`);
      const last = a.tbms[a.tbms.length - 1];
      const t = last ? await api.get<Tbm>(`/tbms/${last.id}`) : null;
      if (alive) onRestore(a, t);
    })().catch(() => undefined);
    return () => { alive = false; };
  }, [onRestore]);
}
