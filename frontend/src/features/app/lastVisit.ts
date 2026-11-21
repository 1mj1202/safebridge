// 홈 화면 앱: 마지막으로 본 언어·구역을 기기에 기억 → 다음 날 새 TBM 이 나와도 그대로 이어서 연다
import { remember } from "../worker/storage";

const LANG = "sb-last-lang";
const ZONE = "sb-last-zone";

export function saveLastVisit(lang: string | null, zone: string | null) {
  if (lang) remember(LANG, lang);
  if (zone) remember(ZONE, zone);
}

/** 최신 TBM 근로자 화면 주소. 처음 여는 TBM 이면 마지막 언어를 미리 채워 둔다.
 *  from=app: 구역 태그가 아니라 앱을 연 것뿐이라 위치를 갱신하지 않는다 */
export function workerPath(token: string): string {
  const lang = remember(LANG);
  const zone = remember(ZONE);
  if (lang && !remember(`sb-lang-${token}`)) remember(`sb-lang-${token}`, lang);
  return `/w/${token}${zone ? `?zone=${encodeURIComponent(zone)}&from=app` : ""}`;
}
