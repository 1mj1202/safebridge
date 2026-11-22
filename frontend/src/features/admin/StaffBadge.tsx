// 머리글 오른쪽: 들어온 부류 이름(발주처·감리는 '보기 전용') + 이용자층 바꾸기
import { ArrowLeftRight } from "lucide-react";
import { useStaff } from "../../shared/staff";
import { backToPicker } from "../entry/picked";

export default function StaffBadge() {
  const { me, can } = useStaff();
  const readOnly = !!me?.ok && !can("edit") && !can("approve");
  return (
    <span className="flex items-center gap-2 text-xs">
      {me?.ok && me.label && <span className="rounded bg-slate-700 px-2 py-0.5">{me.label}{readOnly && " · 보기 전용"}</span>}
      <button type="button" onClick={backToPicker} className="flex items-center gap-1 text-slate-300 hover:text-white">
        <ArrowLeftRight size={13} />이용자층 바꾸기</button>
    </span>
  );
}
