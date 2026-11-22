// 근로자 현장 챗봇 API 응답 타입
import type { Stamp } from "../../shared/stamp";
import type { Plan } from "./FloorPlan";

export type UiKey = "greet" | "ask" | "issue" | "urgent" | "reply" | "change_zone" | "ask_lead"
  | "scan_hint" | "understood" | "understood_q" | "read_again" | "question" | "report" | "listen" | "photo" | "video" | "logout" | "switch_role"
  | "work_day" | "approved" | "published" | "loading";

export interface ZoneRow { zone: string; label: string; storey: string; restricted: boolean; teams: string[]; langs: string[] }

export interface ZonesData {
  lang: string;
  langs: Record<string, string>;
  work_date: string;
  /** 이 화면이 읽는 발행본 (작업일·승인·발행 시각·번호) */
  stamp?: Stamp;
  zones: ZoneRow[];
  ui: Record<UiKey, string>;
}

export interface BriefAction { item_id: string; level: string; hazard: string; when: string | null; do: string | null; extra: string[] }

export interface BriefLine { text: string; item_id?: string; level?: string; rank?: number; pictogram?: string | null; /** 위험 바로 밑 대책 한 줄 */ measure?: string | null }

export interface Brief {
  zone: string;
  label: string;
  storey: string;
  restricted: boolean;
  teams: { team: string; lead: string }[];
  title: string;
  sections: { type: "weather" | "build" | "safety"; title: string; lines: BriefLine[] }[];
  checks: string[];
  plan: Plan | null;
  memo: string;
  /** 응답 언어 (언어를 바꾼 직후 이전 언어 브리핑을 그리지 않게) */
  lang?: string;
  /** 마지막에 기억할 한 줄 — 출입 통제 구역의 출입금지 지침 */
  final?: string | null;
  photo: { key: string; text: string } | null;
  /** 예방 영상(3D 사고 재현) 장면: 위험 순위 순 */
  /** 출입 통제 구역: 맨 위 출입금지 배너 (지침·해제 전까지·이유가 된 위험) */
  ban?: { text: string; until: string; hazards: string[] } | null;
  /** 해야 할 행동: 위험 카드 + 확인 체크리스트를 합친 것 (위험 | 시점, 행동) */
  actions?: BriefAction[];
  /** 카드에 없는 공통 보호구 (안전대·안전모) */
  ppe?: string[];
  labels?: { conditions: string; actions: string; ppe: string; view_3d: string; videos: string };
  sims?: { kind: "fall_edge" | "fall_opening" | "falling_object" | "collapse"; accident: string; measure: string }[];
  videos: KoshaVideo[];
}

/** 화면 안에서 재생할 KOSHA 영상 (url 은 포털 상세, src 는 재생 주소) */
export interface KoshaVideo { title: string; url: string; source: string; kind: "mp4" | "youtube"; src: string }

export interface ChatMsg {
  id: string;
  from: "bot" | "me" | "lead";
  text: string;
  tone?: "urgent" | "reply" | "info" | "sent";
  issue?: { id: number; key: string };
  image?: string; // 내가 보낸 사진 미리보기(작은 사본)
}
