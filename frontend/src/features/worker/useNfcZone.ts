// 화면을 연 채로 구역 NFC 태그에 대면 그 구역으로 바뀐다 (안드로이드 크롬, 버튼으로 시작)
import { useCallback, useEffect, useRef, useState } from "react";
import { nfcSupported, scanUrls, zoneFromUrl } from "../../shared/nfc";

export function useNfcZone(token: string, onZone: (zone: string) => void) {
  const [active, setActive] = useState(false);
  const stop = useRef<(() => void) | null>(null);
  const cb = useRef(onZone);
  cb.current = onZone;
  useEffect(() => () => stop.current?.(), []);
  const start = useCallback(async () => {
    if (stop.current) return;
    try {
      stop.current = await scanUrls((url) => {
        const z = zoneFromUrl(url, token);
        if (z) cb.current(z);
      });
      setActive(true);
    } catch {
      setActive(false);
    }
  }, [token]);
  return { supported: nfcSupported(), active, start };
}
