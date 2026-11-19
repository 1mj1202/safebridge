import { describe, expect, it } from "vitest";
import { VOICE_LANG, cardSpeech } from "./speech";

describe("speech", () => {
  it("maps all 5 languages", () => expect(Object.keys(VOICE_LANG)).toEqual(["ko", "en", "zh", "vi", "th"]));
  it("joins card text", () => expect(cardSpeech("조심할 사고", ["추락", "낙하"])).toBe("조심할 사고. 추락. 낙하"));
});
