import { darkColors, lightColors } from '@/src/theme';

// WCAG 2.x 상대 휘도 · 대비 비율
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('테마 대비 (폴리싱)', () => {
  it.each([
    ['라이트', lightColors],
    ['다크', darkColors],
  ])('%s: primarySoft 위 onPrimarySoft 글자 대비가 4.5 이상', (_, colors) => {
    expect(contrast(colors.onPrimarySoft, colors.primarySoft)).toBeGreaterThanOrEqual(4.5);
  });
});

// (B 방향 "따뜻한 저금통") 크림·갈색 톤으로 바꾸며 글자 4.5 · 큰 숫자·면 경계 3 을 두 모드에서 지킨다
describe('테마 대비 (B 방향)', () => {
  type Key = keyof typeof lightColors;
  const pairs: [string, Key, Key, number][] = [
    ['본문 글자 / 바탕', 'text', 'bg', 4.5],
    ['본문 글자 / 카드', 'text', 'card', 4.5],
    ['회색 글자 / 바탕 (섹션 헤더)', 'textMuted', 'bg', 4.5],
    ['회색 글자 / 카드', 'textMuted', 'card', 4.5],
    ['초록 글자·큰 숫자 / 카드', 'primary', 'card', 4.5],
    ['초록 FAB·선택 면 / 바탕', 'primary', 'bg', 3],
    ['선택 칩·FAB 글자 / 초록 면', 'onPrimary', 'primary', 4.5],
    ['배너 글자 / 옅은 초록', 'onPrimarySoft', 'primarySoft', 4.5],
    ['🔥 칩 글자 / 주황 면', 'onWarn', 'warn', 4.5],
    ['초록 숫자 / 목표 달성 틴트', 'primary', 'warnSoft', 4.5],
    ['회색 글자 / 목표 달성 틴트', 'textMuted', 'warnSoft', 4.5],
    ['지우기 글자 / 카드', 'danger', 'card', 4.5],
    ['스와이프 삭제 글자 / 빨강 면', 'onPrimary', 'danger', 4.5],
    ['오늘 칸 테두리 / 카드', 'todayRing', 'card', 3],
  ];
  it.each([
    ['라이트', lightColors],
    ['다크', darkColors],
  ])('%s: 모든 쌍이 기준 이상', (_, colors) => {
    for (const [name, fg, bg, min] of pairs) {
      const ratio = contrast(colors[fg], colors[bg]);
      if (ratio < min) throw new Error(name + ': ' + ratio.toFixed(2) + ' < ' + min);
    }
  });
});
