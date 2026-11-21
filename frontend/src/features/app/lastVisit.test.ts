import { beforeEach, describe, expect, it } from "vitest";
import { saveLastVisit, workerPath } from "./lastVisit";

// 테스트 환경(node)에는 localStorage 가 없어 메모리로 대신한다
const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage;

describe("홈 화면 앱 이어 열기", () => {
  beforeEach(() => localStorage.clear());

  it("기억한 구역·언어 없이도 최신 TBM 으로 간다", () => {
    expect(workerPath("tok")).toBe("/w/tok");
  });

  it("마지막 언어·구역을 새 TBM 에 이어 붙인다", () => {
    saveLastVisit("vi", "A동 3F-a");
    expect(workerPath("new")).toBe("/w/new?zone=A%EB%8F%99%203F-a&from=app");
    expect(localStorage.getItem("sb-lang-new")).toBe("vi");
  });

  it("그 TBM 에서 이미 고른 언어는 덮어쓰지 않는다", () => {
    saveLastVisit("vi", null);
    localStorage.setItem("sb-lang-new", "th");
    workerPath("new");
    expect(localStorage.getItem("sb-lang-new")).toBe("th");
  });
});
