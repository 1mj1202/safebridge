// 관리자 왼쪽 메뉴 (PDF 별첨 2-10·2-11 목업): 위험 지도 / TBM 초안 / 발행 / 확인 현황 / 신고함 / 오늘의 TBM(근로자 브리핑 미리보기)
// 현장소장·발주처는 '오늘'(부류별 홈, 휴대폰 우선) 메뉴가 먼저 오고, 쓰지 않는 메뉴는 숨긴다 (사용자 결정 2026-11-22)
import { BarChart3, Box, Check, House, MessageSquare, QrCode, Smartphone, type LucideIcon } from "lucide-react";

export type MenuId = "home" | "map" | "draft" | "publish" | "status" | "inbox" | "preview";

export const MENU: { id: MenuId; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "오늘", icon: House },
  { id: "map", label: "위험 지도", icon: Box },
  { id: "draft", label: "TBM 초안", icon: Check },
  { id: "publish", label: "발행", icon: QrCode },
  { id: "status", label: "확인 현황", icon: BarChart3 },
  { id: "inbox", label: "신고함", icon: MessageSquare },
  { id: "preview", label: "오늘의 TBM", icon: Smartphone }, // 언어·구역별 근로자 브리핑 미리보기(기록 없음)
];

const BY_ROLE: Record<string, MenuId[]> = {
  manager: ["home", "draft", "status", "inbox", "map", "preview"],
  viewer: ["home", "map", "status", "inbox", "preview"],
};

/** 부류별 메뉴: 안전관리자는 홈을 뺀 전체. 오늘의 TBM(근로자 브리핑 미리보기)은 모든 부류 */
export function menusFor(role: string | null | undefined) {
  const ids = BY_ROLE[role ?? ""] ?? ["map", "draft", "publish", "status", "inbox", "preview"];
  return ids.map((id) => MENU.find((m) => m.id === id)!);
}

/** 부류별 첫 화면: 안전관리자=위험 지도, 현장소장·발주처=오늘(홈) */
export function startMenu(role: string | null | undefined): MenuId {
  return menusFor(role)[0].id;
}

export interface MenuBadge { n: number; urgent?: boolean }
