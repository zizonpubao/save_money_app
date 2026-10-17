import { estimateEm, fitFontSize } from '@/src/utils/fitText';

describe('fitText (큰 금액 글자 크기)', () => {
  it('숫자·쉼표·원을 폰트 실제 폭으로 어림한다', () => {
    // 2 0 0 0 = 4×0.68, 쉼표 1개 0.29, 원 1.0
    expect(estimateEm('2,000원')).toBeCloseTo(4 * 0.68 + 0.29 + 1.0, 5);
  });

  it('폭이 넉넉하면 원래 크기(40) 그대로다', () => {
    expect(fitFontSize('2,000원', 310, 40)).toBe(40);
    expect(fitFontSize('0원', 310, 40)).toBe(40);
  });

  it('폭을 아직 모르면(첫 렌더) 원래 크기로 시작한다 — 작게 시작하지 않는다', () => {
    expect(fitFontSize('123,456,789원', 0, 40)).toBe(40);
  });

  it('9자리 금액이 좁은 폭을 넘으면 들어갈 만큼만 줄인다', () => {
    const size = fitFontSize('123,456,789원', 250, 40);
    expect(size).toBeLessThan(40);
    expect(size * estimateEm('123,456,789원')).toBeLessThanOrEqual(250);
  });

  it('아무리 좁아도 원래 크기의 0.6배(24) 아래로는 줄이지 않는다 — 4~8pt 로 굳던 버그 방지', () => {
    expect(fitFontSize('123,456,789원', 10, 40)).toBe(24);
  });
});
