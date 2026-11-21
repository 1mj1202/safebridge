// 브리핑 듣기 버튼: 한 번 누르면 읽고, 읽는 중에 다시 누르면 멈춘다 (구역·언어를 바꾸거나 화면을 떠나도 멈춤)
import { useCallback, useEffect, useState } from "react";
import { speak, stopSpeaking } from "./speech";

export function useSpeech(resetKey: string) {
  const [speaking, setSpeaking] = useState(false);
  const stop = useCallback(() => { stopSpeaking(); setSpeaking(false); }, []);
  useEffect(() => stop, [resetKey, stop]);
  const toggle = useCallback((text: string, lang: string) => {
    if (speaking) return stop();
    setSpeaking(true);
    speak(text, lang, 0.9, () => setSpeaking(false));
  }, [speaking, stop]);
  return { speaking, toggle, stop };
}
