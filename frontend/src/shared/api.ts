// API 호출 — /api 는 개발 시 Vite 프록시, 배포 시 nginx 가 백엔드로 넘긴다
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** 401 응답이 오면 알리는 이벤트 이름 (관리자 화면이 듣고 로그인 확인) */
export const UNAUTHORIZED = "sb:unauthorized";

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new CustomEvent(UNAUTHORIZED, { detail: path }));
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    } catch {
      /* 본문 없음 */
    }
    throw new ApiError(res.status, msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(p: string) => request<T>("GET", p),
  post: <T>(p: string, b: unknown = {}) => request<T>("POST", p, b),
  put: <T>(p: string, b: unknown) => request<T>("PUT", p, b),
};
