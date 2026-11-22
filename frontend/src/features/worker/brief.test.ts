import { describe, expect, it } from "vitest";
import { actionLine, briefSpeech } from "./brief";
import type { Brief } from "./fieldTypes";

const base: Brief = {
  zone: "A동 3F-a", label: "A동 3F-a", storey: "3F", restricted: false, teams: [], title: "오늘 A동 3F-a",
  sections: [{ type: "weather", title: "", lines: [{ text: "순간풍속 11.8m/s(10m/s 초과): 양중·단부 작업중지 검토" }] }],
  checks: [], plan: null, memo: "", photo: null, videos: [],
  actions: [{ item_id: "i1", level: "상", hazard: "슬래브 단부에서 추락", when: "작업 시작 전", do: "가장자리 안전난간을 확인하세요", extra: [] }],
  ppe: ["안전대 걸기", "안전모 턱끈 매기"],
  labels: { conditions: "오늘의 작업 조건", actions: "이 구역에서 해야 할 행동", ppe: "공통 보호구", view_3d: "", videos: "" },
};

describe("구역 브리핑 읽기", () => {
  it("시점, 행동", () => {
    expect(actionLine(base.actions![0])).toBe("작업 시작 전, 가장자리 안전난간을 확인하세요");
    expect(actionLine({ ...base.actions![0], when: null })).toBe("가장자리 안전난간을 확인하세요");
  });
  it("음성은 조건 → 행동 → 보호구 순서, 승인 문구 그대로", () => {
    const s = briefSpeech(base);
    expect(s.indexOf("양중·단부 작업중지 검토")).toBeLessThan(s.indexOf("작업 시작 전"));
    expect(s.indexOf("작업 시작 전")).toBeLessThan(s.indexOf("공통 보호구: 안전대 걸기, 안전모 턱끈 매기"));
  });
  it("출입 통제 구역은 출입금지가 맨 앞", () => {
    const s = briefSpeech({ ...base, actions: [], ppe: [], ban: { text: "이 구역은 위층 작업 중이라 출입금지입니다", until: "해제 전까지", hazards: [] } });
    expect(s.startsWith("오늘 A동 3F-a. 이 구역은 위층 작업 중이라 출입금지입니다")).toBe(true);
  });
});
