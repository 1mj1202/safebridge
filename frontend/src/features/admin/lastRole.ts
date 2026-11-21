// 이 기기에서 마지막으로 고른 이용자 부류 — 다음에 열 때 근로자면 근로자 화면으로, 관리자 쪽이면 그 부류 로그인으로
import { remember } from "../worker/storage";

const KEY = "sb-last-role";

export function lastRole(): string | null {
  return remember(KEY);
}

export function setLastRole(role: string): void {
  remember(KEY, role);
}
