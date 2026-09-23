import {
  CONVERSION_LADDER,
  convertAmount,
  dailyLine,
  GOAL_NEAR_RATIO,
  pickBySeed,
  seedOf,
  type DailyLineInput,
} from '@/src/features/dailyLine';
import { formatQuote, quoteOfDay } from '@/src/features/quotes';
import { addDays } from '@/src/utils/date';

const DATE = '2026-09-24';

function line(over: Partial<DailyLineInput> = {}) {
  return dailyLine({
    todayTotal: 4500,
    yesterdayTotal: 0,
    monthTotal: 60000,
    goal: null,
    date: DATE,
    ...over,
  });
}

/** 9월 한 달 동안 날짜만 바꿔 가며 나온 문구 모음 (시드 변형 확인용) */
function textsOverMonth(over: Partial<DailyLineInput>): Set<string> {
  const texts = new Set<string>();
  for (let d = 1; d <= 30; d += 1) {
    texts.add(line({ ...over, date: `2026-09-${String(d).padStart(2, '0')}` }).text);
  }
  return texts;
}

describe('dailyLine 우선순위', () => {
  it('1. 목표 80% 이상 100% 미만이면 남은 금액 (오늘 기록이 없어도 먼저)', () => {
    const l = line({ goal: 300000, monthTotal: 262000, todayTotal: 0 });
    expect(l.kind).toBe('goalNear');
    expect(l.text).toMatch(/^목표까지 38,000원/);
  });

  it('목표 근접 경계: 정확히 80% 는 근접, 80% 미만은 아니다', () => {
    expect(GOAL_NEAR_RATIO).toBe(0.8);
    expect(line({ goal: 100000, monthTotal: 80000 }).kind).toBe('goalNear');
    expect(line({ goal: 100000, monthTotal: 79999 }).kind).not.toBe('goalNear');
  });

  it('목표 달성 후는 따로 없다: 카드 목표 줄이 보여 주므로 명언·환산·어제 대비 규칙을 따른다', () => {
    const noToday = line({ goal: 300000, monthTotal: 312000, todayTotal: 0 });
    expect(noToday).toEqual({ kind: 'quote', text: formatQuote(quoteOfDay(DATE)) });
    expect(line({ goal: 300000, monthTotal: 300000, todayTotal: 4500 }).kind).toBe('conversion');
    for (const text of textsOverMonth({ goal: 300000, monthTotal: 312000, yesterdayTotal: 3000 })) {
      expect(text).not.toMatch(/달성|초과/);
    }
  });

  it('3. 목표가 멀고 오늘 기록이 없으면 오늘의 명언 (어제 기록·월 합계가 있어도)', () => {
    const l = line({ todayTotal: 0, yesterdayTotal: 5000, goal: 300000, monthTotal: 60000 });
    expect(l).toEqual({ kind: 'quote', text: formatQuote(quoteOfDay(DATE)) });
  });

  it('오늘 0 → 명언: 목표가 없어도, 날짜마다 다른 명언', () => {
    expect(line({ todayTotal: 0, yesterdayTotal: 9000 }).kind).toBe('quote');
    expect(textsOverMonth({ todayTotal: 0 }).size).toBeGreaterThanOrEqual(3);
  });

  it('4. 오늘 있음 → 어제 대비 또는 환산, 날짜 시드로 둘 다 나온다', () => {
    const kinds = new Set<string>();
    for (let d = 1; d <= 30; d += 1) {
      const kind = line({
        todayTotal: 9000,
        yesterdayTotal: 4500,
        date: `2026-09-${String(d).padStart(2, '0')}`,
      }).kind;
      expect(['vsYesterday', 'conversion']).toContain(kind);
      kinds.add(kind);
    }
    expect(kinds).toEqual(new Set(['vsYesterday', 'conversion']));
  });

  it('어제 대비 문구: 많으면 +, 같으면 "같아요"', () => {
    // 월 합계가 커피 한 잔 미만이면 환산을 못 하므로 늘 어제 대비가 나온다
    const base = { monthTotal: 3000 };
    expect(line({ ...base, todayTotal: 9000, yesterdayTotal: 4500 }).kind).toBe('vsYesterday');
    expect(textsOverMonth({ ...base, todayTotal: 9000, yesterdayTotal: 4500 })).toContain(
      '어제보다 +4,500원',
    );
    expect(textsOverMonth({ ...base, todayTotal: 4500, yesterdayTotal: 4500 })).toContain(
      '어제와 같아요',
    );
  });

  it('어제보다 적으면 "-N원" 대신 환산, 환산도 못 하면 명언', () => {
    for (let d = 1; d <= 30; d += 1) {
      const date = `2026-09-${String(d).padStart(2, '0')}`;
      expect(line({ monthTotal: 60000, todayTotal: 2500, yesterdayTotal: 4500, date }).kind).toBe(
        'conversion',
      );
      expect(line({ monthTotal: 3000, todayTotal: 2500, yesterdayTotal: 4500, date })).toEqual({
        kind: 'quote',
        text: formatQuote(quoteOfDay(date)),
      });
    }
  });

  it('어제 기록이 없으면 날짜와 상관없이 이번 달 합계 환산', () => {
    for (let d = 1; d <= 30; d += 1) {
      expect(line({ monthTotal: 60000, date: `2026-09-${String(d).padStart(2, '0')}` }).kind).toBe(
        'conversion',
      );
    }
    expect(textsOverMonth({ monthTotal: 60000 })).toContain('= 배달 2번 🛵');
  });

  it('5. 오늘 있지만 어제 기록도 없고 환산도 못 하면(커피 한 잔 미만) 오늘의 명언', () => {
    const l = line({ todayTotal: 3000, monthTotal: 3000 });
    expect(l.kind).toBe('quote');
    expect(l.text).toBe(formatQuote(quoteOfDay(DATE)));
  });

  it('"첫 기록을 기다리는 중" 류 문구는 더 나오지 않는다', () => {
    for (const text of textsOverMonth({ todayTotal: 0 })) {
      expect(text).not.toMatch(/첫 기록|아직 기록이 없/);
    }
  });
});

describe('dailyLine 시드', () => {
  it('같은 입력·같은 날짜면 언제 불러도 같은 문구', () => {
    expect(line({ todayTotal: 0 })).toEqual(line({ todayTotal: 0 }));
    expect(seedOf(DATE)).toBe(seedOf(DATE));
  });

  it('pickBySeed 는 목록 안의 값만 고르고, 날짜가 바뀌면 다른 값도 나온다', () => {
    const options = ['a', 'b', 'c', 'd'] as const;
    const picked = new Set<string>();
    for (let d = 1; d <= 30; d += 1) {
      const v = pickBySeed(options, `2026-09-${String(d).padStart(2, '0')}`, 'test');
      expect(options).toContain(v);
      picked.add(v);
    }
    expect(picked.size).toBeGreaterThan(1);
  });

  it('종류 선택과 표현 선택이 묶이지 않는다: 1년 동안 어제 대비 두 표현이 모두 나온다', () => {
    const texts = new Set<string>();
    for (let i = 0; i < 365; i += 1) {
      const l = line({
        todayTotal: 9000,
        yesterdayTotal: 4500,
        monthTotal: 60000,
        date: addDays('2026-01-01', i),
      });
      if (l.kind === 'vsYesterday') texts.add(l.text);
    }
    expect(texts).toEqual(new Set(['어제보다 +4,500원', '어제보다 4,500원 더 아꼈어요']));
  });

  it('이모지는 환산 줄에만, 한 줄에 최대 1개', () => {
    const emojiRe = /\p{Extended_Pictographic}/gu;
    const cases: Partial<DailyLineInput>[] = [
      { goal: 300000, monthTotal: 262000 },
      { goal: 300000, monthTotal: 312000 },
      { todayTotal: 0 },
      { todayTotal: 9000, yesterdayTotal: 4500 },
      { monthTotal: 60000 },
      { monthTotal: 3000, todayTotal: 3000 },
    ];
    for (const c of cases) {
      for (let d = 1; d <= 30; d += 1) {
        const { kind, text } = line({ ...c, date: `2026-09-${String(d).padStart(2, '0')}` });
        const count = text.match(emojiRe)?.length ?? 0;
        expect(count).toBe(kind === 'conversion' ? 1 : 0);
      }
    }
  });
});

describe('convertAmount (환산 사다리)', () => {
  it('사다리는 10단계, 가격 오름차순이다', () => {
    expect(CONVERSION_LADDER).toHaveLength(10);
    const prices = CONVERSION_LADDER.map((i) => i.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it('커피 한 잔 값 미만이면 null, 딱 4,500원이면 커피 1잔', () => {
    expect(convertAmount(0)).toBeNull();
    expect(convertAmount(4499)).toBeNull();
    expect(convertAmount(4500)).toMatchObject({ item: { name: '커피' }, count: 1 });
  });

  it('합계 이하인 가장 비싼 칸으로, 개수는 소수 버림', () => {
    expect(convertAmount(14999)).toMatchObject({ item: { name: '커피' }, count: 3 });
    expect(convertAmount(15000)).toMatchObject({ item: { name: '영화' }, count: 1 });
    expect(convertAmount(19999)).toMatchObject({ item: { name: '영화' }, count: 1 });
    expect(convertAmount(60000)).toMatchObject({ item: { name: '배달' }, count: 2 });
    expect(convertAmount(249999)).toMatchObject({ item: { name: '운동화' }, count: 2 });
    expect(convertAmount(250000)).toMatchObject({ item: { name: '에어팟' }, count: 1 });
  });

  it('맨 위 칸(노트북) 아래는 항공권, 넘으면 노트북 개수만 늘어난다', () => {
    expect(convertAmount(1499999)).toMatchObject({ item: { name: '항공권' }, count: 1 });
    expect(convertAmount(4600000)).toMatchObject({ item: { name: '노트북' }, count: 3 });
  });
});
