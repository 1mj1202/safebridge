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
  /** 판단 근거 종류: 법령 / 현장 기준(현장 관리 기준, 법령 아님) / 참고 */
  basis?: "법령" | "현장 기준" | "참고";
  /** 법령 기준 설명과 오늘 해당 여부 */
  legal?: string | null;
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
  /** 목록에서 골라 넣을 수 있는 대책 후보 (오늘 조건에 맞는 유사사례 대책) */
  measure_options?: string[];
  /** 대책 원문 → 개조식 짧은 문구 (화면 표시용, 서버가 붙여 줌) */
  measure_short?: Record<string, string>;
  /** 유사사례 원문 대책 중 오늘 작업 단계·장비와 조건이 달라 참고로만 보이는 것 */
  reference_measures?: { text: string; case_id: string; reason: string }[];
  checks: string[];
  evidence: { cases: string[]; elements: string[]; zones: string[]; laws: string[]; guides?: string[]; forecast?: Forecast };
  profile?: { id: string; n: number; likelihood: number; severity: number } | null;
  risk_rank?: number;
  risk_score?: number;
  top?: boolean;
  rank_basis?: { p: number; s: number; p_raw: number; s_raw: number; w: number; weather: number } | null;
  stat?: { weather: string; count: number; total: number; fatal: number; trade: string; source: string } | null;
  evidence_status: string;
  explanation: string;
  included?: boolean;
  weather?: { phrase: string; value: number; basis?: WeatherAlert["basis"]; legal?: string | null };
}

export interface LawArticle {
  id: string;
  law: string;
  article: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  original_text?: string;
  effective_date?: string;
}

export interface Draft {
  date: string;
  storey: string;
  tasks: { id: string; name: string; trade: string; crew: number }[];
  items: DraftItem[];
  briefings?: ZoneBriefing[];
  laws: LawArticle[];
  forecast: Forecast | null;
  summary: string;
  notes: string[];
  data_note: string;
  llm_note: string;
  sources?: { cases: string; profile: string; hourly: { peak: string[]; source: string } };
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
  assessment_id?: number;
  work_date?: string;
  approved_at?: string | null;
  published_at?: string | null;
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
  /** 현장명 · 동 (머리글) */
  site?: string;
}

export interface Accident {
  case_id: string;
  virtual: boolean;
  source?: string;
  category?: string;
  cause_object_raw?: string;
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

export interface Guide {
  id: string;
  title: string;
  year: string;
  source: string;
}

export interface RiskProfile {
  id: string;
  trade: string;
  accident_type: string;
  n: number;
  likelihood: number;
  severity: number;
  top_causes: string[];
  source: string;
}

/** 구역별 챗봇 브리핑 (초안 v5) */
export interface ZoneBriefing {
  zone: string;
  storey: string;
  teams: { team: string; company: string; lead: string; trade: string }[];
  langs: string[];
  restricted: boolean;
  weather: { item_id: string; text: string; level: Level }[];
  build: string[];
  safety: { item_id: string; key: string; hazard: string; level: Level; rank: number | null }[];
  items: string[];
}

/** 근로자 현장 이슈 */
export interface FieldIssue {
  id: number;
  zone: string;
  lang: string;
  text_original: string;
  text_ko: string;
  summary_ko: string;
  urgency: "urgent" | "normal";
  safety: boolean;
  translated: boolean;
  route: string[];
  status: "open" | "answered";
  answer_ko: string;
  answer_translated: string;
  created_at: string;
}

export interface SitePhoto {
  id: number;
  zone: string;
  request: string;
  faces_blurred: number;
  ai_status: "ok" | "check" | "skipped";
  ai_note: string;
  status: "pending" | "confirmed";
  created_at: string;
  image: string;
}
