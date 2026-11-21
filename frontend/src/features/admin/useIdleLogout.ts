// 관리자 화면을 idleMs 동안 쓰지 않으면 로그아웃. 서버 세션도 같은 기준으로 끝난다(admin_sessions.py)
import { useEffect, useRef } from "react";
import { UNAUTHORIZED, api } from "../../shared/api";
import { ACTIVITY_EVENTS, isIdle, shouldTouch, touchEvery } from "./idle";

const CHECK_MS = 5_000;

export function useIdleLogout(on: boolean, idleMs: number, onExpired: () => void) {
  const expired = useRef(onExpired);
  expired.current = onExpired;

  useEffect(() => {
    if (!on) return;
    let lastUsed = Date.now();
    let lastTouched = lastUsed; // 로그인 직후는 서버도 방금 셈
    let done = false;
    const every = touchEvery(idleMs);

    const end = () => {
      if (done) return;
      done = true;
      api.post("/admin/logout").catch(() => {});
      expired.current();
    };
    const touch = () => {
      lastTouched = Date.now();
      api.post("/admin/touch").catch(() => {}); // 실패(401)는 아래 UNAUTHORIZED 에서 처리
    };
    const used = () => {
      const now = Date.now();
      if (isIdle(lastUsed, now, idleMs)) return end(); // 절전 등으로 타이머가 늦은 경우
      lastUsed = now;
      if (shouldTouch(lastUsed, lastTouched, now, every)) touch();
    };
    const check = () => {
      const now = Date.now();
      if (isIdle(lastUsed, now, idleMs)) end();
      else if (shouldTouch(lastUsed, lastTouched, now, every)) touch();
    };
    // 다른 요청이 401 이면 서버 세션이 끝난 것인지 확인 (근로자 PIN 오류 등 다른 401 과 구분)
    const unauthorized = () => {
      api.get<{ ok: boolean }>("/admin/me").then((r) => !r.ok && end(), () => {});
    };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, used, { passive: true, capture: true }));
    document.addEventListener("visibilitychange", check);
    window.addEventListener(UNAUTHORIZED, unauthorized);
    const t = setInterval(check, CHECK_MS);
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, used, { capture: true }));
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener(UNAUTHORIZED, unauthorized);
      clearInterval(t);
    };
  }, [on, idleMs]);
}
