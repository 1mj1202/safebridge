// 관리자 화면을 열면 근로자 앱에 지금 나가는 발행본(/launch)과 그 위험성평가를 먼저 불러온다
// → 관리자와 근로자가 같은 승인본을 본다. 발행본이 없으면 가장 최근 위험성평가.
import { useEffect } from "react";
import { api } from "../../shared/api";
import type { Assessment, Tbm } from "../../shared/types";

export function useRestore(onRestore: (a: Assessment, t: Tbm | null) => void) {
  useEffect(() => {
    let alive = true;
    (async () => {
      const live = await api.get<{ tbm_id: number; assessment_id: number }>("/launch").catch(() => null);
      if (live) {
        const [a, t] = await Promise.all([api.get<Assessment>(`/assessments/${live.assessment_id}`),
          api.get<Tbm>(`/tbms/${live.tbm_id}`)]);
        if (alive) onRestore(a, t);
        return;
      }
      const list = await api.get<{ id: number }[]>("/assessments");
      if (!list.length) return;
      const a = await api.get<Assessment>(`/assessments/${list[0].id}`);
      const last = a.tbms[a.tbms.length - 1];
      const t = last ? await api.get<Tbm>(`/tbms/${last.id}`) : null;
      if (alive) onRestore(a, t);
    })().catch(() => undefined);
    return () => { alive = false; };
  }, [onRestore]);
}
