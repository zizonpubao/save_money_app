import {
  DEFAULT_REMINDER_TIME,
  parseReminderEnabled,
  parseReminderTime,
  REMINDER_LABEL,
  REMINDER_PLAN_OFF,
  REMINDER_WINDOW_DAYS,
  reminderDates,
  reminderEnabledAlert,
  reminderStatusText,
  reminderWhenLabel,
  type ReminderPlan,
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

describe('알림 상태 안내 (설정 화면에 보이는 문구)', () => {
  const scheduled = (date: string, time: string, skippedToday = false): ReminderPlan => ({
    status: 'scheduled',
    next: dateAtTime(date, time),
    skippedToday,
  });

  it('기능 이름은 "매일 기록 알림" 이다 (시간을 고를 수 있어 "저녁" 을 붙이지 않는다)', () => {
    expect(REMINDER_LABEL).toBe('매일 기록 알림');
  });

  it('다음 알림 시각을 오늘·내일·날짜로 읽기 쉽게 적는다', () => {
    expect(reminderWhenLabel(dateAtTime('2026-11-09', '21:00'), NOW)).toBe('오늘 21:00');
    expect(reminderWhenLabel(dateAtTime('2026-11-10', '08:05'), NOW)).toBe('내일 08:05');
    expect(reminderWhenLabel(dateAtTime('2026-11-12', '21:00'), NOW)).toBe('11월 12일 21:00');
  });

  it('꺼져 있으면 안내 줄이 없다', () => {
    expect(reminderStatusText(REMINDER_PLAN_OFF, NOW)).toBeNull();
  });

  it('예약돼 있으면 다음 알림 시각을 보여 준다', () => {
    expect(reminderStatusText(scheduled('2026-11-09', '21:00'), NOW)).toBe('다음 알림은 오늘 21:00');
  });

  it('오늘 이미 기록했으면 그 이유와 다음 시각을 같이 알려 준다 (알림이 왜 안 오는지 알 수 있게)', () => {
    expect(reminderStatusText(scheduled('2026-11-10', '21:00', true), NOW)).toBe(
      '오늘은 이미 기록했어요. 다음 알림은 내일 21:00',
    );
  });

  it('권한이 꺼졌거나 예약에 실패하면 그대로 알린다', () => {
    expect(reminderStatusText({ status: 'denied', next: null, skippedToday: false }, NOW)).toContain('아이폰 설정');
    expect(reminderStatusText({ status: 'failed', next: null, skippedToday: false }, NOW)).toContain('예약하지 못했어요');
  });

  it('켠 직후 확인 창: 시간·건너뛰는 규칙·다음 알림 시각을 알려 준다', () => {
    const alert = reminderEnabledAlert(scheduled('2026-11-09', '21:00'), '21:00', NOW);
    expect(alert.title).toBe('기록 알림을 켰어요');
    expect(alert.message).toBe(
      '매일 21:00에 알려 드려요.\n그날 이미 기록했으면 울리지 않아요.\n다음 알림은 오늘 21:00이에요.',
    );
  });

  it('켠 직후 확인 창: 오늘 이미 기록했으면 내일부터 울린다고 알린다', () => {
    const alert = reminderEnabledAlert(scheduled('2026-11-10', '21:00', true), '21:00', NOW);
    expect(alert.message).toContain('오늘은 이미 기록해서 내일 21:00부터 울려요.');
  });

  it('켠 직후 확인 창: 예약에 실패하면 성공한 척하지 않는다', () => {
    const alert = reminderEnabledAlert({ status: 'failed', next: null, skippedToday: false }, '21:00', NOW);
    expect(alert.title).toBe('알림을 예약하지 못했어요');
  });
});
