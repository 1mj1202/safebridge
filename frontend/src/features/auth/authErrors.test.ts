import { describe, expect, it } from "vitest";
import { ApiError } from "../../shared/api";
import { authErrorKey, cleanPin } from "./authErrors";

describe("가입·로그인 화면", () => {
  it("서버 응답을 근로자 언어 문구 키로 바꾼다", () => {
    expect(authErrorKey(new ApiError(409, ""))).toBe("taken");
    expect(authErrorKey(new ApiError(429, ""))).toBe("locked");
    expect(authErrorKey(new ApiError(401, ""))).toBe("wrong");
    expect(authErrorKey(new Error("net"))).toBe("wrong");
  });

  it("PIN 은 숫자 4자리만", () => {
    expect(cleanPin("12a3 45")).toBe("1234");
  });
});
