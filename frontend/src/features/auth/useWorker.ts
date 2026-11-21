// 로그인한 근로자(쿠키) · '가입 없이 보기' 선택(기기에 기억)
import { useCallback, useEffect, useState } from "react";
import { api } from "../../shared/api";
import { remember } from "../worker/storage";
import type { Worker } from "./types";

const GUEST = "sb-guest";

export function useWorker() {
  // undefined: 확인 중, null: 로그인 안 함
  const [worker, setWorker] = useState<Worker | null | undefined>(undefined);
  const [guest, setGuestState] = useState(() => remember(GUEST) === "1");

  useEffect(() => {
    api.get<{ worker: Worker | null }>("/workers/me").then((r) => setWorker(r.worker), () => setWorker(null));
  }, []);

  const setGuest = useCallback((on: boolean) => { remember(GUEST, on ? "1" : null); setGuestState(on); }, []);
  const signedIn = useCallback((w: Worker) => { setWorker(w); setGuest(false); }, [setGuest]);
  const logout = useCallback(async () => {
    await api.post("/workers/logout").catch(() => undefined);
    setWorker(null);
    setGuest(false);
  }, [setGuest]);

  return { worker, guest, setGuest, signedIn, logout };
}
