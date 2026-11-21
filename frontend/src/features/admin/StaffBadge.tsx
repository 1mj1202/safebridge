// 머리글 오른쪽: 로그인한 부류 이름(발주처·감리는 '보기 전용') + 로그아웃
import { LogOut } from "lucide-react";
import { useStaff } from "../../shared/staff";

export default function StaffBadge() {
  const { me, logout, can } = useStaff();
  if (!me?.required || !me.ok) return null;
  const readOnly = !can("edit") && !can("approve");
  return (
    <span className="flex items-center gap-2 text-xs">
      <span className="rounded bg-slate-700 px-2 py-0.5">{me.label}{readOnly && " · 보기 전용"}</span>
      <button type="button" onClick={logout} className="flex items-center gap-1 text-slate-300 hover:text-white">
        <LogOut size={13} />로그아웃</button>
    </span>
  );
}
