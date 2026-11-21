// 관리자 왼쪽 메뉴 (PDF 별첨 2-10·2-11 목업): 위험 지도 / TBM 초안 / 발행 / 확인 현황 / 신고함
import { BarChart3, Box, Check, MessageSquare, QrCode, type LucideIcon } from "lucide-react";

export type MenuId = "map" | "draft" | "publish" | "status" | "inbox";

export const MENU: { id: MenuId; label: string; icon: LucideIcon }[] = [
  { id: "map", label: "위험 지도", icon: Box },
  { id: "draft", label: "TBM 초안", icon: Check },
  { id: "publish", label: "발행", icon: QrCode },
  { id: "status", label: "확인 현황", icon: BarChart3 },
  { id: "inbox", label: "신고함", icon: MessageSquare },
];

/** 부류별 첫 화면: 안전관리자=위험 지도, 현장소장=TBM 초안(승인), 발주처·감리=확인 현황 */
export function startMenu(role: string | null | undefined): MenuId {
  if (role === "manager") return "draft";
  if (role === "viewer") return "status";
  return "map";
}

export interface MenuBadge { n: number; urgent?: boolean }
