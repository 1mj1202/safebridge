// 근로자 현장 챗봇 API 응답 타입
import type { Plan } from "./FloorPlan";

export type UiKey = "greet" | "ask" | "issue" | "urgent" | "reply" | "change_zone" | "ask_lead"
  | "understood" | "question" | "report" | "listen";

export interface ZoneRow { zone: string; label: string; storey: string; restricted: boolean; teams: string[]; langs: string[] }

export interface ZonesData {
  lang: string;
  langs: Record<string, string>;
  work_date: string;
  zones: ZoneRow[];
  ui: Record<UiKey, string>;
}

export interface BriefLine { text: string; item_id?: string; level?: string; rank?: number; pictogram?: string | null }

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
}

export interface ChatMsg {
  id: string;
  from: "bot" | "me" | "lead";
  text: string;
  tone?: "urgent" | "reply" | "info";
  issue?: { id: number; key: string };
}
