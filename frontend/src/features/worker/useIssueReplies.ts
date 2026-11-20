// 보낸 이슈의 회신을 주기적으로 확인 → 오면 대화에 붙인다
import { useEffect } from "react";
import { api } from "../../shared/api";
import type { ChatMsg } from "./fieldTypes";

interface IssueStatus { status: "open" | "answered"; answer: string }

export function useIssueReplies(token: string, msgs: ChatMsg[], add: (m: ChatMsg) => void, ms = 10000) {
  const pending = msgs.filter((m) => m.issue && !msgs.some((r) => r.id === `reply-${m.issue!.id}`));
  const ids = pending.map((m) => `${m.issue!.id}:${m.issue!.key}`).join(",");
  useEffect(() => {
    if (!ids) return;
    const check = () => ids.split(",").forEach((s) => {
      const [id, key] = s.split(":");
      api.get<IssueStatus>(`/w/${token}/issues/${id}?key=${encodeURIComponent(key)}`).then((r) => {
        if (r.status === "answered") add({ id: `reply-${id}`, from: "lead", tone: "reply", text: r.answer });
      }).catch(() => undefined);
    });
    const t = setInterval(check, ms);
    return () => clearInterval(t);
  }, [ids, token, add, ms]);
}
