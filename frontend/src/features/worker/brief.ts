// 구역 브리핑 읽기 순서 — 화면(BriefMessage)과 음성(듣기)이 같은 순서·같은 문장을 쓴다
// 출입금지 배너 → 오늘의 작업 조건 → 해야 할 행동(위험 | 시점, 행동) → 공통 보호구 → 관리자 한마디
import type { Brief, BriefAction } from "./fieldTypes";
import { cardSpeech } from "./speech";

/** "작업 시작 전, 가장자리 안전난간을 확인하세요" — 시점이 없으면 행동만 */
export function actionLine(a: BriefAction): string {
  return [a.when, a.do].filter(Boolean).join(", ");
}

export function briefSpeech(b: Brief): string {
  const weather = b.sections.find((s) => s.type === "weather")?.lines.map((l) => l.text) ?? [];
  const acts = (b.actions ?? []).flatMap((a) => [`${a.hazard}: ${actionLine(a)}`, ...a.extra]);
  return cardSpeech(b.title, [b.ban?.text ?? "", b.ban?.until ?? "", ...weather, ...acts,
    b.ppe?.length ? `${b.labels?.ppe ?? ""}: ${b.ppe.join(", ")}` : "", b.memo].filter(Boolean));
}

/** 3D 사고 재현 자막: 행동 카드 문장 */
export function briefCaptions(b: Brief): string[] {
  return (b.actions ?? []).map((a) => `${a.hazard}: ${actionLine(a)}`);
}
