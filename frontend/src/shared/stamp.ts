// 발행본 표시 — 작업일·승인·발행 시각·발행 번호 (관리자 발행 화면과 근로자 화면이 같은 줄을 보여 대조할 수 있게)
export interface Stamp {
  tbm_id: number;
  assessment_id?: number;
  work_date: string; // YYYY-MM-DD
  approved_at: string | null; // UTC ISO
  published_at: string | null; // UTC ISO
}

const TZ = "Asia/Seoul";

/** "2026-11-24" → "11/24" */
export function shortDate(d: string): string {
  const [, m, day] = d.split("-");
  return m && day ? `${Number(m)}/${Number(day)}` : d;
}

/** UTC ISO → 한국 시각 "11/20 10:09" */
export function kstTime(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(t).map((x) => [x.type, x.value]));
  return `${p.month}/${p.day} ${p.hour}:${p.minute}`;
}

export function stampLine(s: Stamp, labels: { work_day: string; approved: string; published: string }): string {
  return [
    `${labels.work_day} ${shortDate(s.work_date)}`,
    s.approved_at ? `${labels.approved} ${kstTime(s.approved_at)}` : "",
    `${labels.published} #${s.tbm_id}${s.published_at ? ` ${kstTime(s.published_at)}` : ""}`,
  ].filter(Boolean).join(" · ");
}
