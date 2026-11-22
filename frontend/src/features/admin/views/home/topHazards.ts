// 초안에서 오늘 위험 상위 N개 (관리자가 뺀 항목 제외, 위험 순위 순)
import type { Assessment, DraftItem } from "../../../../shared/types";

export function topHazards(a: Assessment | null, n = 3): DraftItem[] {
  if (!a) return [];
  return a.draft.items.filter((i) => i.included !== false && !i.key.startsWith("weather_"))
    .sort((x, y) => (x.risk_rank ?? 99) - (y.risk_rank ?? 99)).slice(0, n);
}
