import { describe, expect, it } from "vitest";
import { splitLangs } from "./langs";

describe("splitLangs", () => {
  it("keeps the five main languages first and folds the rest", () => {
    expect(splitLangs(["ko", "en", "zh", "vi", "th", "ne", "mn", "lo", "tet", "my"]))
      .toEqual({ main: ["ko", "en", "zh", "vi", "th"], more: ["ne", "mn", "lo", "tet", "my"] });
    expect(splitLangs(["ne", "ko"])).toEqual({ main: ["ko"], more: ["ne"] });
  });
});
