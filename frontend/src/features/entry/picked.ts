// 이번 접속(브라우저 탭)에서 이용자층을 이미 골랐는지 — 새로 열면(주소·QR·홈 화면 앱) 다시 고르게 한다
const KEY = "sb-role-picked";

export function picked(): boolean {
  try { return sessionStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function markPicked(): void {
  try { sessionStorage.setItem(KEY, "1"); } catch { /* 저장 못 해도 화면은 넘어간다 */ }
}
