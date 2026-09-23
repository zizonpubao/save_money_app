import {
  addMonths,
  daysInMonth,
  formatKoDate,
  formatKoMonth,
  fromDate,
  monthRange,
  thisMonth,
  thisYear,
  toDate,
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
