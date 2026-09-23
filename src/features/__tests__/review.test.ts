import { reviewMessage, reviewMonthOf, shouldShowReview } from '@/src/features/review';

describe('shouldShowReview (M4 지난달 회고)', () => {
  it.each(['2026-10-01', '2026-10-02', '2026-10-03'])('%s (1~3일) 에는 띄운다', (day) => {
    expect(shouldShowReview(day, null, 23)).toBe(true);
  });

  it('4일부터는 띄우지 않는다', () => {
    expect(shouldShowReview('2026-10-04', null, 23)).toBe(false);
    expect(shouldShowReview('2026-10-31', null, 23)).toBe(false);
  });

  it('지난달 회고를 닫았으면 띄우지 않는다', () => {
    expect(shouldShowReview('2026-10-02', '2026-09', 23)).toBe(false);
  });

  it('지지난달을 닫은 기록은 이번 회고에 영향이 없다', () => {
    expect(shouldShowReview('2026-10-02', '2026-08', 23)).toBe(true);
  });

  it('지난달 기록이 0건이면 띄우지 않는다', () => {
    expect(shouldShowReview('2026-10-01', null, 0)).toBe(false);
  });

  it('회고 대상은 지난달, 1월이면 작년 12월', () => {
    expect(reviewMonthOf('2026-10-01')).toBe('2026-09');
    expect(reviewMonthOf('2027-01-02')).toBe('2026-12');
    expect(shouldShowReview('2027-01-02', '2026-12', 5)).toBe(false);
  });
});

describe('reviewMessage', () => {
  it('"9월엔 23번 참아 184,000원 · 최다 ☕ 커피"', () => {
    expect(reviewMessage('2026-09', 23, 184000, { emoji: '☕', name: '커피' })).toBe(
      '9월엔 23번 참아 184,000원 · 최다 ☕ 커피',
    );
  });

  it('12월·1건도 같은 모양', () => {
    expect(reviewMessage('2026-12', 1, 4500, { emoji: '📦', name: '미분류' })).toBe(
      '12월엔 1번 참아 4,500원 · 최다 📦 미분류',
    );
  });

  it('최다 카테고리가 없으면 뒷부분을 뺀다', () => {
    expect(reviewMessage('2026-09', 2, 9000, null)).toBe('9월엔 2번 참아 9,000원');
  });
});
