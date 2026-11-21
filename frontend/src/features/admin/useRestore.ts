// 관리자 화면을 새로고침해도 가장 최근 위험성평가와 발행한 TBM 을 다시 불러온다
import { useEffect } from "react";
import { api } from "../../shared/api";
import type { Assessment, Tbm } from "../../shared/types";

export function useRestore(onRestore: (a: Assessment, t: Tbm | null) => void) {
  useEffect(() => {
    let alive = true;
    (async () => {
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
