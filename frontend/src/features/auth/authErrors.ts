// 가입·로그인 실패 → 화면 문구 키
import { ApiError } from "../../shared/api";
import type { AuthUiKey } from "./types";

export function authErrorKey(e: unknown): AuthUiKey {
  if (e instanceof ApiError) {
    if (e.status === 409) return "taken";
    if (e.status === 429) return "locked";
  }
  return "wrong";
}

/** PIN 칸: 숫자만, 4자리까지 */
export function cleanPin(v: string): string {
  return v.replace(/\D/g, "").slice(0, 4);
}
