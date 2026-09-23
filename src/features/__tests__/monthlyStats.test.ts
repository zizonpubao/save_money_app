import type { Category, CategoryTotal, DailyTotal, MonthlyTotal } from '@/src/db';
import {
  axisDays,
  buildCategoryRows,
  buildDailyBars,
  buildMonthlyBars,
  canGoNext,
  canGoNextYear,
  canGoPrev,
  canGoPrevYear,
  dailyAverage,
  monthForYear,
  monthlyAverage,
  toDailyChartBars,
  toMonthlyChartBars,
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
  it('31일 달은 25 다음이 말일 31이다 (말일에 붙은 30은 겹쳐서 뺀다)', () => {
    expect(axisDays('2026-10')).toEqual([1, 5, 10, 15, 20, 25, 31]);
  });

  it('30일 달은 1 · 5일 단위 · 30 이다 (말일과 겹치는 30은 한 번만)', () => {
    expect(axisDays('2026-09')).toEqual([1, 5, 10, 15, 20, 25, 30]);
  });

  it('2월은 25 다음이 말일 28이다', () => {
    expect(axisDays('2026-02')).toEqual([1, 5, 10, 15, 20, 25, 28]);
  });

  it('윤년 2월은 말일이 29일이다', () => {
    expect(axisDays('2028-02')).toEqual([1, 5, 10, 15, 20, 25, 29]);
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

describe('monthlyAverage (년 모드 월 평균)', () => {
  it('이번 해 9월이면 9로 나눈다', () => {
    expect(monthlyAverage(180000, '2026', '2026-09-24')).toBe(20000);
  });

  it('지난 해면 12로 나눈다', () => {
    expect(monthlyAverage(120000, '2025', '2026-09-24')).toBe(10000);
  });

  it('이번 해 1월이면 총액이 그대로 월 평균이다', () => {
    expect(monthlyAverage(4500, '2026', '2026-01-10')).toBe(4500);
  });

  it('기록이 없으면 0이다', () => {
    expect(monthlyAverage(0, '2026', '2026-09-24')).toBe(0);
  });

  it('나눈 값은 원 단위 정수로 반올림한다', () => {
    expect(monthlyAverage(10000, '2025', '2026-09-24')).toBe(833);
  });
});

describe('buildMonthlyBars', () => {
  const TOTALS: MonthlyTotal[] = [
    { month: '2026-03', total: 50000 },
    { month: '2026-09', total: 184000 },
  ];

  it('1월부터 12월까지 12칸을 빠짐없이 채운다', () => {
    const bars = buildMonthlyBars('2026', TOTALS);
    expect(bars.map((b) => b.month)).toEqual(
      Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`),
    );
  });

  it('기록 없는 달은 0, 최고 달만 isMax 이고 비율은 최고 달 기준이다', () => {
    const bars = buildMonthlyBars('2026', TOTALS);
    expect(bars[0]).toMatchObject({ monthNumber: 1, total: 0, ratio: 0, isMax: false });
    expect(bars[8]).toMatchObject({ monthNumber: 9, total: 184000, ratio: 1, isMax: true });
    expect(bars.filter((b) => b.isMax)).toHaveLength(1);
    expect(bars[2]?.ratio).toBeCloseTo(50000 / 184000);
  });

  it('기록이 하나도 없으면 12칸 모두 0이고 isMax 도 없다', () => {
    const bars = buildMonthlyBars('2026', []);
    expect(bars).toHaveLength(12);
    expect(bars.every((b) => b.total === 0 && !b.isMax)).toBe(true);
  });
});

describe('BarChart 칸 변환', () => {
  it('월별 칸은 "9월" 라벨이고 축 숫자는 1~12월 전부 붙는다', () => {
    const bars = toMonthlyChartBars(buildMonthlyBars('2026', []));
    expect(bars[8]?.label).toBe('9월');
    expect(bars.map((b) => b.axisLabel)).toEqual([
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
    ]);
  });

  it('일별 칸은 "23일" 라벨이고 축 숫자는 1 · 5일 단위 · 말일에만 붙는다', () => {
    const bars = toDailyChartBars(buildDailyBars('2026-09', []), axisDays('2026-09'));
    expect(bars[22]?.label).toBe('23일');
    expect(bars[22]?.key).toBe('2026-09-23');
    expect(bars.filter((b) => b.axisLabel !== null).map((b) => b.axisLabel)).toEqual([
      '1', '5', '10', '15', '20', '25', '30',
    ]);
  });
});

describe('년 이동 경계', () => {
  it('가장 오래된 기록의 해보다 앞으로는 못 간다', () => {
    expect(canGoPrevYear('2026', '2025')).toBe(true);
    expect(canGoPrevYear('2025', '2025')).toBe(false);
  });

  it('기록이 하나도 없으면 이전 해로 못 간다', () => {
    expect(canGoPrevYear('2026', null)).toBe(false);
  });

  it('올해보다 미래로는 못 간다', () => {
    expect(canGoNextYear('2025', '2026')).toBe(true);
    expect(canGoNextYear('2026', '2026')).toBe(false);
  });
});

describe('monthForYear (년 → 월 모드로 돌아갈 달)', () => {
  it('보던 달이 그 해 안이면 그대로 둔다', () => {
    expect(monthForYear('2026', '2026-03', '2026-09')).toBe('2026-03');
  });

  it('올해로 옮겨 왔으면 이번 달', () => {
    expect(monthForYear('2026', '2025-05', '2026-09')).toBe('2026-09');
  });

  it('지난 해로 옮겨 갔으면 그 해 12월', () => {
    expect(monthForYear('2024', '2026-09', '2026-09')).toBe('2024-12');
  });
});
