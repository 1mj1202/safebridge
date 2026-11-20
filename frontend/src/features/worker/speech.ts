// 음성 안내 — 브라우저 내장 Web Speech API (설치·외부 전송 없음)
// 테툼어는 브라우저 음성이 없어 포르투갈어 음성으로 읽는다(철자 대부분이 포르투갈어식이라 발음이 비슷함)
export const VOICE_LANG: Record<string, string> = {
  ko: "ko-KR", en: "en-US", zh: "zh-CN", vi: "vi-VN", th: "th-TH",
  ne: "ne-NP", mn: "mn-MN", lo: "lo-LA", tet: "pt-PT", my: "my-MM",
};

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string, lang: string, rate = 0.9): void {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = VOICE_LANG[lang] ?? lang;
  u.rate = rate;
  const v = window.speechSynthesis.getVoices().find((x) => x.lang.replace("_", "-").startsWith(u.lang.slice(0, 2)));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

/** 카드 한 장을 읽을 문장으로 */
export function cardSpeech(title: string, lines: string[]): string {
  return [title, ...lines].join(". ");
}
