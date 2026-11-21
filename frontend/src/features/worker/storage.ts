// 기기에 언어·구역만 기억 (개인정보 없음). 저장소가 막혀 있어도 화면은 그대로 동작
export function remember(key: string, value?: string | null): string | null {
  try {
    if (value === null) localStorage.removeItem(key);
    else if (value !== undefined) localStorage.setItem(key, value);
    return localStorage.getItem(key);
  } catch {
    return value ?? null;
  }
}

/** 같은 기기에서 처음 한 번만 true (새로고침·앱 다시 열기에도 다시 세지 않는다) */
export function once(key: string): boolean {
  try {
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, "1");
  } catch { /* 저장소 차단 시 그냥 기록 */ }
  return true;
}

/** once 로 이미 기록했는지 (기록하지 않고 확인만) */
export function seen(key: string): boolean {
  try { return !!localStorage.getItem(key); } catch { return false; }
}
