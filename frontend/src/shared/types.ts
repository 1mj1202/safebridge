// 백엔드 응답 형식 (app/api/*.py 와 맞춘다)
export type Vec3 = [number, number, number];

export interface ElementMesh {
  tag: string;
  ifc_class: string;
  name: string;
  storey: string;
  bbox_min: Vec3;
  bbox_max: Vec3;
  vertices: number[];
  faces: number[];
}

export interface BimModel {
  storeys: { name: string; elevation: number }[];
  elements: ElementMesh[];
  openings: Omit<ElementMesh, "vertices" | "faces">[];
}

export interface Task {
  id: string;
  name: string;
  trade: string;
  storey: string;
  start: string;
  end: string;
  crew: number;
  element_tags: string[];
}

export interface Zone {
  id: string;
  kind: "fall" | "drop";
  label: string;
  storey: string;
  min: Vec3;
  max: Vec3;
  element_tags: string[];
  rule: string;
  task_ids: string[];
}

export interface WeatherAlert {
  code: string;
  level: "stop" | "warn" | "info";
  text: string;
  rule: string | null;
  value: number;
}

export interface Forecast {
  date: string;
  source: string;
  wind_gust: number;
  rain_mm_h: number;
  temp_min: number;
  temp_max: number;
  sky: string;
}

export interface RiskResponse {
  date: string;
  tasks: Task[];
  zones: Zone[];
  element_status: Record<string, "done" | "active" | "planned">;
  weather: { forecast: Forecast; alerts: WeatherAlert[] };
}

export type Level = "상" | "중" | "하";

export interface DraftItem {
  id: string;
  key: string;
  hazard: string;
  trades: string[];
  location: string;
  storeys: string[];
  level: Level;
  frequency: { count: number; of: number } | null;
  measures: string[];
  checks: string[];
  evidence: { cases: string[]; elements: string[]; zones: string[]; laws: string[]; forecast?: Forecast };
  evidence_status: string;
  explanation: string;
  included?: boolean;
}

export interface LawArticle {
  id: string;
  law: string;
  article: string;
  title: string;
  summary: string;
  url: string;
  source: string;
}

export interface Draft {
  date: string;
  storey: string;
  tasks: { id: string; name: string; trade: string; crew: number }[];
  items: DraftItem[];
  laws: LawArticle[];
  forecast: Forecast | null;
  summary: string;
  notes: string[];
  data_note: string;
  llm_note: string;
}

export interface TraceStep {
  tool: string;
  input: Record<string, unknown>;
  ok: boolean;
  auto: boolean;
  error?: string;
}

export interface Assessment {
  id: number;
  work_date: string;
  storey: string;
  query: string;
  status: "draft" | "approved";
  draft: Draft;
  trace: TraceStep[];
  provider: string;
  tbms: { id: number; token: string }[];
}

export interface CardLine {
  text: string;
  pictogram: string | null;
  level: Level;
  item_id: string;
}

export interface Card {
  type: "place" | "hazard" | "check";
  title: string;
  lines: (string | CardLine)[];
  storey?: string;
  zone_ids?: string[];
  memo?: string;
  memo_ko?: string;
  memo_translated?: boolean;
}

export interface TermCheck {
  kept: number;
  total: number;
  rate: number;
  missed: { ko: string; expected: string }[];
}

export interface MemoCheck {
  source: string;
  translated: string;
  back: string;
  ok: boolean;
  terms: { rate: number; kept: number; total: number } | null;
  note: string;
}

export interface Tbm {
  id: number;
  token: string;
  url: string;
  cards: Record<string, Card[]>;
  translation_check: { phrases: Record<string, TermCheck>; memo?: Record<string, MemoCheck> };
}

export interface TbmStatus {
  langs: Record<string, { viewed: number; understood: number; question: number; rate: number | null;
    needs_followup: boolean }>;
  reports: { id: number; kind: string; lang: string; text_original: string; text_ko: string; created_at: string }[];
}

export interface Meta {
  today: string;
  provider: string;
  langs: Record<string, string>;
  public_web_url: string;
}

export interface Accident {
  case_id: string;
  virtual: boolean;
  date: string;
  trade: string;
  work: string;
  accident_type: string;
  cause_object: string;
  causes: string[];
  measures: string[];
  severity: string;
  confidence: number;
  raw_text: string;
}
