// 초안 카드 아래쪽에 붙어 다니는 '수정 저장 / 검토 완료·승인' 버튼 줄 (스크롤해도 항상 보임)
// 오른쪽 칸 아래 여백(모바일 p-4, PC pb-8)만큼 내려 붙여 화면 맨 아래에 닿게 한다
import { Button } from "../../shared/ui";

export default function DraftActions({ dirty, busy, onSave, onApprove }: {
  dirty: boolean; busy: boolean; onSave: () => void; onApprove: () => void }) {
  return (
    <div className="sticky -bottom-4 z-10 lg:-bottom-8 -mx-4 -mb-4 mt-3 flex items-center justify-end gap-2 rounded-b-xl border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
      {dirty && <span className="mr-auto text-xs text-slate-400">수정 내용을 저장한 뒤 승인할 수 있어요</span>}
      <Button kind="ghost" disabled={!dirty || busy} onClick={onSave}>수정 저장</Button>
      <Button kind="danger" disabled={dirty || busy} onClick={onApprove}>검토 완료 · 승인</Button>
    </div>
  );
}
