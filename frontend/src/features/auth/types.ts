// 근로자 계정 API 타입
export interface Worker { id: number; name: string; company: string; team: string; lang: string }

export type AuthUiKey = "signup" | "login" | "name" | "company" | "pin" | "guest" | "have_account" | "new_account"
  | "wrong" | "taken" | "locked" | "logout";

export interface CompaniesData {
  companies: { company: string; team: string; trade: string }[];
  ui: Record<AuthUiKey, string>;
}
