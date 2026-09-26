import {
  addDays,
  addMonths,
  addYears,
  clampDate,
  dayNumber,
  entryDateBounds,
  daysInMonth,
  firstWeekday,
  formatKoDate,
  formatKoMonth,
  formatKoYear,
  fromDate,
  monthOfYear,
  monthRange,
  thisMonth,
  thisYear,
  toDate,
  toYear,
  today,
  yearRange,
} from '../date';

describe('today / thisMonth', () => {
  it('YYYY-MM-DD 형식이다', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('thisMonth 는 today 의 앞 7자리와 같다', () => {
    expect(thisMonth()).toBe(today().slice(0, 7));
  });
});

describe('formatKoDate', () => {
  it('한국어 날짜와 요일을 만든다', () => {
    expect(formatKoDate('2026-09-23')).toBe('2026년 9월 23일 (수)');
  });

  it('월/일 앞자리 0을 뺀다', () => {
    expect(formatKoDate('2026-01-05')).toBe('2026년 1월 5일 (월)');
  });

  it('요일이 정확하다 (일요일)', () => {
    expect(formatKoDate('2026-09-27')).toBe('2026년 9월 27일 (일)');
  });

  it('잘못된 날짜는 그대로 돌려준다', () => {
    expect(formatKoDate('not-a-date')).toBe('not-a-date');
  });
});

describe('formatKoMonth', () => {
  it('YYYY년 M월 형식이다', () => {
    expect(formatKoMonth('2026-09')).toBe('2026년 9월');
    expect(formatKoMonth('2026-12')).toBe('2026년 12월');
  });
});

describe('monthRange', () => {
  it('30일 달', () => {
    expect(monthRange('2026-09')).toEqual({ start: '2026-09-01', end: '2026-09-30' });
  });

  it('31일 달', () => {
    expect(monthRange('2026-10')).toEqual({ start: '2026-10-01', end: '2026-10-31' });
  });

  it('평년 2월', () => {
    expect(monthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });

  it('윤년 2월', () => {
    expect(monthRange('2028-02')).toEqual({ start: '2028-02-01', end: '2028-02-29' });
  });
});

describe('addMonths', () => {
  it('연도를 넘어가며 더하고 뺀다', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-09', 0)).toBe('2026-09');
  });
});

describe('daysInMonth', () => {
  it('월별 일 수', () => {
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2026-09')).toBe(30);
    expect(daysInMonth('2026-10')).toBe(31);
  });
});

describe('thisYear / yearRange', () => {
  it('thisYear 는 today 의 앞 4자리', () => {
    expect(thisYear()).toBe(today().slice(0, 4));
  });

  it('yearRange 는 1월 1일 ~ 12월 31일', () => {
    expect(yearRange('2026')).toEqual({ start: '2026-01-01', end: '2026-12-31' });
  });
});

describe('년 유틸 (toYear / formatKoYear / addYears / monthOfYear)', () => {
  it('toYear 는 날짜·월에서 앞 4자리를 뗀다', () => {
    expect(toYear('2026-09-23')).toBe('2026');
    expect(toYear('2026-09')).toBe('2026');
  });

  it('formatKoYear 는 "2026년"', () => {
    expect(formatKoYear('2026')).toBe('2026년');
  });

  it('addYears 는 연도를 더하고 뺀다', () => {
    expect(addYears('2026', -1)).toBe('2025');
    expect(addYears('2026', 1)).toBe('2027');
  });

  it('monthOfYear 는 1~12', () => {
    expect(monthOfYear('2026-09-23')).toBe(9);
    expect(monthOfYear('2026-01')).toBe(1);
    expect(monthOfYear('2026-12-31')).toBe(12);
  });
});

describe('toDate / fromDate', () => {
  it('왕복 변환이 된다', () => {
    expect(fromDate(toDate('2026-09-23'))).toBe('2026-09-23');
    expect(fromDate(toDate('2028-02-29'))).toBe('2028-02-29');
  });

  it('Date 는 로컬 자정이다', () => {
    const d = toDate('2026-09-23');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(23);
    expect(d.getHours()).toBe(0);
  });
});

describe('addDays / firstWeekday / dayNumber (M3.6)', () => {
  it('addDays 는 달·해 경계를 넘는다', () => {
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });

  it('firstWeekday 는 1일의 요일 (0 = 일요일)', () => {
    expect(firstWeekday('2026-09')).toBe(2); // 화
    expect(firstWeekday('2026-02')).toBe(0); // 일
    expect(firstWeekday('2026-08')).toBe(6); // 토
  });

  it('dayNumber 는 하루에 1씩 늘고 달 경계에서도 이어진다', () => {
    expect(dayNumber('1970-01-01')).toBe(0);
    expect(dayNumber('2026-10-01') - dayNumber('2026-09-30')).toBe(1);
  });
});

describe('entryDateBounds (기록 날짜 범위: 작년 1월 1일 ~ 오늘)', () => {
  it('연중: 2026-09-26 → 2025-01-01 ~ 2026-09-26', () => {
    expect(entryDateBounds('2026-09-26')).toEqual({ min: '2025-01-01', max: '2026-09-26' });
  });
  it('연초 경계: 2026-01-01 → 2025-01-01 ~ 2026-01-01', () => {
    expect(entryDateBounds('2026-01-01')).toEqual({ min: '2025-01-01', max: '2026-01-01' });
  });
  it('연말 경계: 2026-12-31 → 2025-01-01 ~ 2026-12-31 (다음 날 2027-01-01 이면 min 이 2026-01-01)', () => {
    expect(entryDateBounds('2026-12-31')).toEqual({ min: '2025-01-01', max: '2026-12-31' });
    expect(entryDateBounds('2027-01-01')).toEqual({ min: '2026-01-01', max: '2027-01-01' });
  });
  it('인자가 없으면 오늘 기준이다', () => {
    const bounds = entryDateBounds();
    expect(bounds.max).toBe(today());
    expect(bounds.min).toBe(`${Number(thisYear()) - 1}-01-01`);
  });
});

describe('clampDate', () => {
  it('범위 안은 그대로, 밖은 가까운 끝으로 당긴다', () => {
    expect(clampDate('2025-06-15', '2025-01-01', '2026-09-26')).toBe('2025-06-15');
    expect(clampDate('2024-12-31', '2025-01-01', '2026-09-26')).toBe('2025-01-01');
    expect(clampDate('2026-09-27', '2025-01-01', '2026-09-26')).toBe('2026-09-26');
    expect(clampDate('2025-01-01', '2025-01-01', '2026-09-26')).toBe('2025-01-01');
    expect(clampDate('2026-09-26', '2025-01-01', '2026-09-26')).toBe('2026-09-26');
  });
});
