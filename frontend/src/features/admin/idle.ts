// 관리자 자동 로그아웃 계산 (화면과 분리해 테스트)
/** 사용자가 화면을 실제로 쓴 것으로 보는 입력. 자동 새로고침·영상 재생은 들어가지 않는다 */
export const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

/** 서버에 "아직 쓰는 중"을 알리는 최소 간격 (만료 시간보다 충분히 짧게) */
export const TOUCH_EVERY_MS = 60_000;
export const touchEvery = (idleMs: number) => Math.min(TOUCH_EVERY_MS, idleMs / 4);

export function isIdle(lastUsed: number, now: number, idleMs: number): boolean {
  return now - lastUsed >= idleMs;
}

/** 마지막으로 쓴 뒤, 아직 서버에 안 알렸고 간격이 지났으면 알린다 */
export function shouldTouch(lastUsed: number, lastTouched: number, now: number, everyMs = TOUCH_EVERY_MS): boolean {
  return lastUsed > lastTouched && now - lastTouched >= everyMs;
}
