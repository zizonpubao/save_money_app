import {
  CONFETTI_COUNT,
  celebrationTier,
  confettiFrame,
  makeConfettiPieces,
} from '@/src/features/celebration';

describe('celebrationTier (M4 금액 구간)', () => {
  it.each([
    [1, 'base'],
    [9999, 'base'],
    [10000, 'mid'],
    [49999, 'mid'],
    [50000, 'big'],
    [1000000, 'big'],
  ] as const)('%i원 → %s', (amount, tier) => {
    expect(celebrationTier(amount)).toBe(tier);
  });

  it('구간별 컨페티 수: 1만원 미만 0 · 1만원 이상 20 · 5만원 이상 40', () => {
    expect(CONFETTI_COUNT).toEqual({ base: 0, mid: 20, big: 40 });
  });
});

describe('makeConfettiPieces', () => {
  it('요청한 수만큼 만들고, 같은 시드면 같은 배치다', () => {
    const a = makeConfettiPieces(20, 1727150400000);
    expect(a).toHaveLength(20);
    expect(makeConfettiPieces(20, 1727150400000)).toEqual(a);
  });

  it('시드(저장 시각)가 다르면 배치가 달라진다', () => {
    expect(makeConfettiPieces(20, 1)).not.toEqual(makeConfettiPieces(20, 2));
  });

  it('시작점은 가운데 ±60 안, 색은 4색 순번 중 하나', () => {
    const pieces = makeConfettiPieces(40, 42);
    for (const p of pieces) {
      expect(Math.abs(p.x0)).toBeLessThanOrEqual(60);
      expect([0, 1, 2, 3]).toContain(p.color);
      expect(p.rise).toBeGreaterThan(0);
      expect(p.fall).toBeGreaterThan(0);
    }
  });

  it('0개면 빈 목록', () => {
    expect(makeConfettiPieces(0, 1)).toEqual([]);
  });
});

describe('confettiFrame', () => {
  const piece = { x0: 10, drift: 20, rise: 60, fall: 120, rot0: 30, spin: 360, color: 0 as const };

  it('시작은 기준점, 불투명', () => {
    const f = confettiFrame(piece, 0);
    expect(f.x).toBe(10);
    expect(f.y).toBeCloseTo(0);
    expect(f.rotate).toBe(30);
    expect(f.opacity).toBe(1);
  });

  it('위로 rise 만큼 튀어 올랐다가 끝에는 fall 만큼 아래에서 투명해진다', () => {
    const ys = Array.from({ length: 101 }, (_, i) => confettiFrame(piece, i / 100).y);
    expect(Math.min(...ys)).toBeCloseTo(-60, 0);
    const end = confettiFrame(piece, 1);
    expect(end.y).toBeCloseTo(120);
    expect(end.x).toBe(30);
    expect(end.rotate).toBe(390);
    expect(end.opacity).toBe(0);
  });

  it('떨어질수록 빨라진다 (중력)', () => {
    const dy1 = confettiFrame(piece, 0.8).y - confettiFrame(piece, 0.7).y;
    const dy2 = confettiFrame(piece, 1).y - confettiFrame(piece, 0.9).y;
    expect(dy2).toBeGreaterThan(dy1);
  });
});
