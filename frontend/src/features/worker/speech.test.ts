import { describe, expect, it } from "vitest";
import { VOICE_LANG, cardSpeech, speak, stopSpeaking } from "./speech";

describe("speech", () => {
  it("maps all 10 languages", () =>
    expect(Object.keys(VOICE_LANG)).toEqual(["ko", "en", "zh", "vi", "th", "ne", "mn", "lo", "tet", "my"]));
  it("joins card text", () => expect(cardSpeech("조심할 사고", ["추락", "낙하"])).toBe("조심할 사고. 추락. 낙하"));
});

describe("speak / stopSpeaking", () => {
  it("calls onEnd when reading finishes and cancel stops it", () => {
    const said: { onend?: () => void }[] = [];
    let cancels = 0;
    const w = globalThis as unknown as Record<string, unknown>;
    w.window = w;
    w.speechSynthesis = { cancel: () => { cancels++; }, speak: (u: { onend?: () => void }) => said.push(u), getVoices: () => [] };
    w.SpeechSynthesisUtterance = class { lang = ""; rate = 1; voice = null; onend?: () => void; onerror?: () => void; constructor(public text: string) {} };
    let ended = false;
    speak("hi", "ko", 0.9, () => { ended = true; });
    said[0].onend?.();
    expect(ended).toBe(true);
    stopSpeaking();
    expect(cancels).toBe(2);
    delete w.speechSynthesis; delete w.SpeechSynthesisUtterance; delete w.window;
  });
});
