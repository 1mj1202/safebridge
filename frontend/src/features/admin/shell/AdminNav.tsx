// 왼쪽 세로 메뉴(PC) / 아래쪽 탭(휴대폰). 신고함·확인 현황에 알림 숫자, 승인 전 '발행'은 흐리게
import type { MenuBadge, MenuId } from "./menu";
import type { MENU } from "./menu";

interface Props {
  cur: MenuId;
  onPick: (id: MenuId) => void;
  badges: Partial<Record<MenuId, MenuBadge>>;
  dimmed: Partial<Record<MenuId, boolean>>;
  items: typeof MENU;
}

export default function AdminNav({ cur, onPick, badges, dimmed, items }: Props) {
  return (
    <nav aria-label="관리자 메뉴"
      className="order-last flex shrink-0 border-t border-slate-200 bg-white text-slate-500 lg:order-first lg:border-r lg:border-t-0 lg:w-24 lg:flex-col lg:py-2">
      {items.map(({ id, label, icon: Icon }) => {
        const on = cur === id;
        const b = badges[id];
        return (
          <button key={id} type="button" onClick={() => onPick(id)} aria-current={on ? "page" : undefined}
            className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] lg:flex-none lg:py-4 lg:text-xs ${
              on ? "bg-brand-50 font-semibold text-brand-700" : "hover:bg-slate-50 hover:text-brand-700"} ${dimmed[id] && !on ? "opacity-40" : ""}`}>
            <Icon size={18} />
            {label}
            {b && b.n > 0 && (
              <span className={`absolute right-2 top-1.5 min-w-[18px] rounded-full px-1 text-[10px] font-bold leading-[18px] text-white lg:right-3 ${
                b.urgent ? "bg-red-600" : "bg-slate-500"}`}>{b.n}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
