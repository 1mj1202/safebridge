// 근로자 현장 챗봇 API 응답 타입
import type { Plan } from "./FloorPlan";

export type UiKey = "greet" | "ask" | "issue" | "urgent" | "reply" | "change_zone" | "ask_lead"
  | "scan_hint" | "understood" | "understood_q" | "read_again" | "question" | "report" | "listen" | "photo" | "video" | "logout" | "switch_role";

export interface ZoneRow { zone: string; label: string; storey: string; restricted: boolean; teams: string[]; langs: string[] }

export interface ZonesData {
  lang: string;
  langs: Record<string, string>;
  work_date: string;
  zones: ZoneRow[];
  ui: Record<UiKey, string>;
}

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
  photo: { key: string; text: string } | null;
  /** 예방 영상(3D 사고 재현) 장면: 위험 순위 순 */
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
