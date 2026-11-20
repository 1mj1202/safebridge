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

/** 같은 기기에서 처음 한 번만 true */
export function once(key: string): boolean {
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
  } catch { /* 저장소 차단 시 그냥 기록 */ }
  return true;
}
