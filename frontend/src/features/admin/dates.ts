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
