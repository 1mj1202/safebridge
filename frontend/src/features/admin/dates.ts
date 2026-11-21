// 날짜 유틸 (YYYY-MM-DD 문자열, 시간대 영향 없이 계산)
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  const p = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  return Math.round((p(b) - p(a)) / 86400000);
}

const WD = ["일", "월", "화", "수", "목", "금", "토"];
export function label(day: string, today?: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const wd = WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const rel = today ? { 0: " (오늘)", 1: " (내일)", [-1]: " (어제)" }[daysBetween(today, day)] ?? "" : "";
  return `${m}월 ${d}일 (${wd})${rel}`;
}

/** 검토 중인 초안의 작업일이 지금 보고 있는 날짜와 다른가 (다르면 승인·발행을 막는다) */
export function otherDay(draftDay: string | null | undefined, viewDay: string | null | undefined): boolean {
  return !!draftDay && !!viewDay && draftDay !== viewDay;
}

/** "2026-11-24" → "11/24" (머리글 기상 배지) */
export function shortDay(iso: string): string {
  const [, m, d] = iso.split("-");
  return m && d ? `${Number(m)}/${Number(d)}` : iso;
}
