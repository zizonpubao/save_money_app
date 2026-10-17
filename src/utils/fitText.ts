/**
 * 큰 금액 숫자의 글자 크기를 JS 에서 직접 정한다.
 *
 * 왜 adjustsFontSizeToFit 을 쓰지 않나: iOS 정식 빌드(New Architecture)에서 홈 카드의 큰 숫자가
 * 폭과 상관없이 아주 작게(4~8pt) 굳었다 (TestFlight 빌드 5·6, "0원"처럼 짧은 값에서도). Expo Go 에서는 재현되지 않았다.
 * - 사실 (RN 0.86 소스 확인): iOS 의 RCTTextLayoutManager.mm 는 minimumFontScale 을 읽지 않고 minimumFontSize 만 쓴다.
 *   값이 없으면 바닥이 4pt 다. 그래서 우리가 준 0.6배 하한은 무시됐다.
 * - 사실: 줄이는 함수(NSTextStorage+FontScaling)는 폭과 높이가 둘 다 맞아야 멈춘다.
 * - 추정 (기기에서 재현 못 함): 고정 lineHeight(52)와 한글 '원'의 줄 높이 때문에 높이가 늘 넘친다고 보고 바닥까지 줄였다.
 * 그래서 네이티브 자동 줄임을 아예 쓰지 않고, 폰트 파일의 실제 글자 폭으로 문자열 폭을 어림해 크기를 고른다.
 */

/**
 * Outfit ExtraBold(display 숫자 폰트)의 글자 폭 (em, 폰트 파일 hmtx 에서 읽음).
 * 숫자는 가장 넓은 '0'(0.671)보다 살짝 크게 잡아 tabular-nums 와 굵기 차이를 덮는다.
 * '원' 은 시스템 한글 폰트라 정사각형(1em)으로 넉넉히 잡는다.
 */
const EM = {
  digit: 0.68,
  comma: 0.29,
  minus: 0.6,
  other: 1.0,
} as const;

/** 문자열이 글자 크기 1 일 때 차지하는 폭(em) 어림값 */
export function estimateEm(text: string): number {
  let em = 0;
  for (const ch of text) {
    if (ch >= '0' && ch <= '9') em += EM.digit;
    else if (ch === ',') em += EM.comma;
    else if (ch === '-') em += EM.minus;
    else em += EM.other;
  }
  return em;
}

/**
 * 폭 width 안에 text 가 한 줄로 들어가는 글자 크기. base 를 넘지 않고, base * minScale 아래로 줄이지 않는다.
 * width 를 아직 모르면(0 이하, 첫 렌더) base 그대로 — 작게 시작했다 커지는 일이 없게 한다.
 */
export function fitFontSize(text: string, width: number, base: number, minScale = 0.6): number {
  if (!(width > 0)) return base;
  const em = estimateEm(text);
  if (em <= 0) return base;
  const fitted = Math.floor(width / em);
  return Math.max(Math.round(base * minScale), Math.min(base, fitted));
}
