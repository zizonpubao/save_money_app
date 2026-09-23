import type { Category, CategoryTotal, DailyTotal } from '@/src/db';
import {
  axisDays,
  buildCategoryRows,
  buildDailyBars,
  canGoNext,
  canGoPrev,
  dailyAverage,
} from '@/src/features/monthlyStats';

const 커피: Category = { id: 1, name: '커피', emoji: '☕', sortOrder: 0, isDefault: true };
const 택시: Category = { id: 2, name: '택시', emoji: '🚕', sortOrder: 1, isDefault: true };
const CATEGORIES = [커피, 택시];

describe('dailyAverage', () => {
  it('지난 달은 그 달 전체 일수로 나눈다', () => {
    // 2026-09 는 30일
    expect(dailyAverage(300000, '2026-09', '2026-10-05')).toBe(10000);
  });

  it('이번 달은 오늘까지 경과일로 나눈다', () => {
    expect(dailyAverage(100000, '2026-09', '2026-09-10')).toBe(10000);
  });

  it('이번 달 1일이면 총액이 그대로 하루 평균이 된다', () => {
    expect(dailyAverage(4500, '2026-09', '2026-09-01')).toBe(4500);
  });

  it('이번 달 말일이면 그 달 전체 일수로 나눈 값과 같다', () => {
    expect(dailyAverage(300000, '2026-09', '2026-09-30')).toBe(10000);
  });

  it('윤년 2월은 29일로 나눈다', () => {
    expect(dailyAverage(290000, '2024-02', '2024-03-01')).toBe(10000);
  });

  it('평년 2월은 28일로 나눈다', () => {
    expect(dailyAverage(280000, '2026-02', '2026-03-01')).toBe(10000);
  });

  it('기록이 없으면 0이다', () => {
    expect(dailyAverage(0, '2026-09', '2026-09-10')).toBe(0);
  });

  it('나눈 값은 원 단위 정수로 반올림한다', () => {
    expect(dailyAverage(10000, '2026-09', '2026-09-03')).toBe(3333);
  });
});

describe('buildDailyBars', () => {
  const totals: DailyTotal[] = [
    { date: '2026-09-01', total: 5000 },
    { date: '2026-09-15', total: 10000 },
  ];

  it('1일부터 말일까지 빠짐없이 채운다', () => {
    const bars = buildDailyBars('2026-09', totals);
    expect(bars).toHaveLength(30);
    expect(bars[0]?.day).toBe(1);
    expect(bars[29]?.date).toBe('2026-09-30');
  });

  it('기록 없는 날은 total 0 · ratio 0 이다 (빈 트랙)', () => {
    const bars = buildDailyBars('2026-09', totals);
    expect(bars[1]).toMatchObject({ day: 2, total: 0, ratio: 0, isMax: false });
  });

  it('높이 비율은 그 달 최댓값 기준이고 최고값만 isMax 다', () => {
    const bars = buildDailyBars('2026-09', totals);
    expect(bars[0]).toMatchObject({ total: 5000, ratio: 0.5, isMax: false });
    expect(bars[14]).toMatchObject({ total: 10000, ratio: 1, isMax: true });
  });

  it('기록이 하나도 없으면 모든 막대가 0이고 isMax 도 없다', () => {
    const bars = buildDailyBars('2026-02', []);
    expect(bars).toHaveLength(28);
    expect(bars.every((b) => b.total === 0 && b.ratio === 0 && !b.isMax)).toBe(true);
  });

  it('최고 금액이 같은 날이 둘이면 둘 다 isMax 다', () => {
    const bars = buildDailyBars('2026-09', [
      { date: '2026-09-03', total: 7000 },
      { date: '2026-09-04', total: 7000 },
    ]);
    expect(bars.filter((b) => b.isMax).map((b) => b.day)).toEqual([3, 4]);
  });
});

describe('axisDays', () => {
  it('31일 달은 1·15·31 세 개만 라벨을 붙인다', () => {
    expect(axisDays('2026-10')).toEqual([1, 15, 31]);
  });

  it('30일 달은 1·15·30 이다', () => {
    expect(axisDays('2026-09')).toEqual([1, 15, 30]);
  });

  it('2월은 말일이 28일이다', () => {
    expect(axisDays('2026-02')).toEqual([1, 15, 28]);
  });
});

describe('buildCategoryRows', () => {
  const totals: CategoryTotal[] = [
    { categoryId: 2, total: 12000 },
    { categoryId: 1, total: 8000 },
  ];

  it('많은 순으로 이름·이모지·비율을 채운다', () => {
    expect(buildCategoryRows(totals, CATEGORIES)).toEqual([
      { key: '2', emoji: '🚕', name: '택시', total: 12000, percent: 60 },
      { key: '1', emoji: '☕', name: '커피', total: 8000, percent: 40 },
    ]);
  });

  it('카테고리 없는 기록은 "미분류" 로 맨 뒤에 둔다 (금액이 제일 커도)', () => {
    const rows = buildCategoryRows([{ categoryId: null, total: 80000 }, ...totals], CATEGORIES);
    expect(rows.map((r) => r.name)).toEqual(['택시', '커피', '미분류']);
    expect(rows[2]).toMatchObject({ key: 'none', emoji: '📦', total: 80000, percent: 80 });
  });

  it('이미 지워진 카테고리 id 도 미분류로 합친다', () => {
    const rows = buildCategoryRows(
      [
        { categoryId: 99, total: 1000 },
        { categoryId: null, total: 1000 },
      ],
      CATEGORIES,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: '미분류', total: 2000, percent: 100 });
  });

  it('기록이 없으면 빈 배열이다', () => {
    expect(buildCategoryRows([], CATEGORIES)).toEqual([]);
  });
});

describe('월 이동 경계', () => {
  it('가장 오래된 기록의 달보다 앞으로는 못 간다', () => {
    expect(canGoPrev('2026-09', '2026-08')).toBe(true);
    expect(canGoPrev('2026-08', '2026-08')).toBe(false);
  });

  it('기록이 하나도 없으면 이전 달로 못 간다', () => {
    expect(canGoPrev('2026-09', null)).toBe(false);
  });

  it('이번 달보다 미래로는 못 간다', () => {
    expect(canGoNext('2026-08', '2026-09')).toBe(true);
    expect(canGoNext('2026-09', '2026-09')).toBe(false);
  });
});
