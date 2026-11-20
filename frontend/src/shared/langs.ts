// 언어 순서: 초안 v5 기본 5개(한국어·영어·중국어·베트남어·태국어)는 늘 보이고, 나머지는 "더 보기"로 접는다
export const MAIN_LANGS = ["ko", "en", "zh", "vi", "th"] as const;

export function splitLangs(langs: string[]): { main: string[]; more: string[] } {
  const main = MAIN_LANGS.filter((l) => langs.includes(l)) as string[];
  return { main, more: langs.filter((l) => !main.includes(l)) };
}
