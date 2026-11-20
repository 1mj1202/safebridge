// Web NFC (안드로이드 크롬만 지원) — 구역 태그에 구역 주소(URL 레코드)를 쓰고 읽는다.
// 태그에 URL 을 넣어 두면 아이폰·안드로이드 모두 앱 없이 태그에 대기만 해도 그 주소가 열린다.
interface NdefRecord { recordType: string; data?: DataView }
interface NdefReadingEvent extends Event { message: { records: NdefRecord[] } }
interface NdefReader extends EventTarget {
  scan(opts?: { signal?: AbortSignal }): Promise<void>;
  write(msg: { records: { recordType: string; data: string }[] }): Promise<void>;
}
type NdefCtor = new () => NdefReader;

function ctor(): NdefCtor | null {
  return typeof window !== "undefined" && "NDEFReader" in window
    ? (window as unknown as { NDEFReader: NdefCtor }).NDEFReader : null;
}

export function nfcSupported(): boolean {
  return ctor() !== null;
}

export async function writeUrl(url: string): Promise<void> {
  const C = ctor();
  if (!C) throw new Error("이 브라우저는 NFC 쓰기를 지원하지 않아요 (안드로이드 크롬 필요)");
  await new C().write({ records: [{ recordType: "url", data: url }] });
}

/** 태그를 읽을 때마다 URL 을 넘긴다. 반환한 함수로 중지. 사용자 동작(클릭) 안에서 불러야 한다. */
export async function scanUrls(onUrl: (url: string) => void): Promise<() => void> {
  const C = ctor();
  if (!C) throw new Error("NFC 미지원");
  const ctl = new AbortController();
  const r = new C();
  r.addEventListener("reading", (e) => {
    for (const rec of (e as NdefReadingEvent).message.records) {
      if ((rec.recordType === "url" || rec.recordType === "absolute-url") && rec.data) onUrl(new TextDecoder().decode(rec.data));
    }
  });
  await r.scan({ signal: ctl.signal });
  return () => ctl.abort();
}

/** 같은 TBM 의 구역 주소면 구역 이름, 아니면 null */
export function zoneFromUrl(url: string, token: string): string | null {
  try {
    const u = new URL(url);
    return u.pathname.endsWith(`/w/${token}`) ? u.searchParams.get("zone") : null;
  } catch {
    return null;
  }
}
