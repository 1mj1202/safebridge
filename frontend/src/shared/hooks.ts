import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export function useFetch<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    api.get<T>(path).then(
      (d) => alive && (setData(d), setError(null)),
      (e: Error) => alive && setError(e.message),
    );
    return () => {
      alive = false;
    };
  }, [path, n]);
  const reload = useCallback(() => setN((x) => x + 1), []);
  return { data, error, reload };
}

/** ms 간격으로 다시 불러오기 (TBM 확인 현황) */
export function usePoll(reload: () => void, ms: number, on: boolean) {
  useEffect(() => {
    if (!on) return;
    const t = setInterval(reload, ms);
    return () => clearInterval(t);
  }, [reload, ms, on]);
}
