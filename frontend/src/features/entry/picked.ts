// 이번 접속(브라우저 탭)에서 이용자층을 이미 골랐는지 — 새로 열면(주소·QR·홈 화면 앱) 다시 고르게 한다
// 고른 화면의 브라우저 기록 위치(idx)도 기억해, 뒤로 가기로 그 앞까지 돌아오면 다시 선택 화면을 보여 준다
const KEY = "sb-role-picked";

function get(): string | null {
  try { return sessionStorage.getItem(KEY); } catch { return null; }
}

export function picked(): boolean {
  return get() !== null;
}

/** 선택 화면이 있던 기록 위치 */
export function gateIdx(): number {
  return Number(get() ?? -1);
}

export function markPicked(idx: number): void {
  try { sessionStorage.setItem(KEY, String(idx)); } catch { /* 저장 못 해도 화면은 넘어간다 */ }
}

export function unmarkPicked(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* */ }
}

/** react-router 가 history.state 에 넣는 기록 위치 */
export function historyIdx(): number {
  const s = window.history.state as { idx?: number } | null;
  return typeof s?.idx === "number" ? s.idx : 0;
}
