import { describe, expect, it } from "vitest";
import { VOICE_LANG } from "./speech";
import { NO_PII, SENT, THANKS } from "./messages";

describe("worker messages", () => {
  it("cover every voice language", () => {
    for (const l of Object.keys(VOICE_LANG)) {
      expect(SENT[l] && NO_PII[l] && THANKS[l], l).toBeTruthy();
    }
  });
});
