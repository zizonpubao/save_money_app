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
