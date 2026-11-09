import {
  DEFAULT_REMINDER_TIME,
  parseReminderEnabled,
  parseReminderTime,
  REMINDER_WINDOW_DAYS,
  reminderDates,
} from '@/src/features/reminder';
import { dateAtTime, formatTime, fromDate } from '@/src/utils/date';

const NOW = dateAtTime('2026-11-09', '18:30');

describe('parseReminderEnabled', () => {
  it("'1' 만 켬이고 없거나 다른 값은 기본값 끔", () => {
    expect(parseReminderEnabled('1')).toBe(true);
    expect(parseReminderEnabled('0')).toBe(false);
    expect(parseReminderEnabled(null)).toBe(false);
    expect(parseReminderEnabled('true')).toBe(false);
  });
});

describe('parseReminderTime', () => {
  it('HH:mm 은 그대로', () => {
    expect(parseReminderTime('07:05')).toBe('07:05');
    expect(parseReminderTime('23:59')).toBe('23:59');
  });

  it.each([null, '', '24:00', '9:00', '21:60', 'abc'])('%s 는 기본값 21:00', (value) => {
    expect(parseReminderTime(value)).toBe(DEFAULT_REMINDER_TIME);
    expect(DEFAULT_REMINDER_TIME).toBe('21:00');
  });
});

describe('reminderDates', () => {
  const plan = (over: Partial<Parameters<typeof reminderDates>[0]> = {}) =>
    reminderDates({ now: NOW, time: '21:00', hasEntryToday: false, ...over });

  it('오늘 기록이 없고 시간이 안 지났으면 오늘부터 14일치', () => {
    const dates = plan();
    expect(dates).toHaveLength(REMINDER_WINDOW_DAYS);
    expect(fromDate(dates[0] as Date)).toBe('2026-11-09');
    expect(fromDate(dates[13] as Date)).toBe('2026-11-22');
  });

  it('모든 예약이 설정한 시각이다', () => {
    expect(new Set(plan({ time: '07:45', now: dateAtTime('2026-11-09', '06:00') }).map(formatTime))).toEqual(
      new Set(['07:45']),
    );
  });

  it('하루에 하나씩이다', () => {
    const days = plan().map(fromDate);
    expect(new Set(days).size).toBe(days.length);
  });

  it('오늘 기록이 있으면 오늘 몫만 뺀다', () => {
    const dates = plan({ hasEntryToday: true });
    expect(dates).toHaveLength(REMINDER_WINDOW_DAYS - 1);
    expect(fromDate(dates[0] as Date)).toBe('2026-11-10');
    expect(fromDate(dates.at(-1) as Date)).toBe('2026-11-22');
  });

  it('설정 시각이 이미 지났으면 오늘 몫을 뺀다', () => {
    const dates = plan({ time: '18:00' });
    expect(dates).toHaveLength(REMINDER_WINDOW_DAYS - 1);
    expect(fromDate(dates[0] as Date)).toBe('2026-11-10');
  });

  it('설정 시각과 지금이 정확히 같으면 오늘 몫을 뺀다', () => {
    expect(fromDate(plan({ time: '18:30' })[0] as Date)).toBe('2026-11-10');
  });

  it('달이 넘어가도 날짜가 이어진다', () => {
    const dates = plan({ now: dateAtTime('2026-12-25', '10:00') });
    expect(fromDate(dates.at(-1) as Date)).toBe('2027-01-07');
  });
});
