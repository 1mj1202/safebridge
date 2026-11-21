// 관리자 쪽 로그인 정보(부류·권한) — 안전관리자 / 현장소장·원청 / 발주처·감리
import { createContext, useContext } from "react";

export type StaffAction = "view" | "analyze" | "edit" | "approve" | "publish" | "reply" | "photo";

export interface StaffMe {
  required: boolean;
  ok: boolean;
  idle_seconds?: number;
  role: string | null;
  label: string;
  perms: StaffAction[];
  roles: { id: string; label: string }[];
}

export const StaffContext = createContext<{ me: StaffMe | null; logout: () => void }>({ me: null, logout: () => {} });

export function useStaff() {
  const { me, logout } = useContext(StaffContext);
  // 잠금 없는 개발 서버(옛 서버)면 전부 허용
  const can = (a: StaffAction) => !me || !me.required || me.perms.includes(a);
  return { me, logout, can };
}
