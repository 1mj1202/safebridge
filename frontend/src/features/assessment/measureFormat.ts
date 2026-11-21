// 대책 문장을 개조식으로 보이게 나눈다: 앞의 조건(~경우/~시/~때) + 뒤의 조치
// 원문 글자는 바꾸지 않고 나누기만 한다. 서술형 끝맺음(~해야 합니다 등)만 명사형으로 줄인다.

// '실시 ', '표시 ' 처럼 '시'로 끝나는 낱말은 조건이 아니다
const NOT_COND = /(실|표|감|지|게|개|제|명|점|중|일|임|즉|수|동|당|평)시$/;
const MARK = /(경우(?:에는|에도)?|[가-힣]\s?시(?:에는|에도)?|때(?:에는)?)\s/g;

const ACTION_IN_COND = /(설치|실시|착용|사용|체결|확보|배치|금지|준수|철저)\s*(및|,)/;

export function plainEnding(text: string): string {
  return text.trim()
    .replace(/\s*(?:하여야|해야)\s*(?:합니다|한다|함|됩니다|된다)\.?$/, "")
    .replace(/(?:하십시오|하세요|합니다|한다)\.?$/, "")
    .replace(/(?:해야\s*)?할\s*것\.?$/, "")
    .replace(/(을|를)$/, "")
    .replace(/\.$/, "")
    .trim();
}

export function splitMeasure(text: string): { cond: string; action: string } {
  const t = plainEnding(text);
  let cut = -1;
  for (const m of t.matchAll(MARK)) {
    const word = m[1];
    if (/시(?:에는|에도)?$/.test(word) && NOT_COND.test(word.replace(/(에는|에도)$/, "").replace(/\s/, ""))) continue;
    const end = (m.index ?? 0) + m[0].length;
    if (t.length - end >= 6) cut = end;
  }
  // 조건 안에 이미 조치(설치 및 …)가 들어 있으면 나누지 않는다
  if (cut <= 0 || ACTION_IN_COND.test(t.slice(0, cut))) return { cond: "", action: t };
  return { cond: t.slice(0, cut).trim(), action: t.slice(cut).trim() };
}
