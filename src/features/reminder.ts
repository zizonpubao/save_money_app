import { addDays, dateAtTime, fromDate } from '@/src/utils/date';

export const DEFAULT_REMINDER_TIME = '21:00';
/** 오늘부터 며칠치를 예약할지. iOS 예약 한도(64개) 안이고, 2주 안에 앱을 안 열면 조용해진다 */
export const REMINDER_WINDOW_DAYS = 14;
export const REMINDER_TITLE = '오늘 참은 소비 있나요?';
export const REMINDER_BODY = '커피 한 잔이라도 좋아요. 적어 두면 쌓여요.';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** settings reminder_enabled 값. '1' 만 켬이고, 없거나 다른 값이면 기본값(끔)으로 본다 */
export function parseReminderEnabled(value: string | null): boolean {
  return value === '1';
}

/** settings reminder_time 값. 'HH:mm' 이 아니면 기본값 */
export function parseReminderTime(value: string | null): string {
  return value !== null && TIME_PATTERN.test(value) ? value : DEFAULT_REMINDER_TIME;
}

export type ReminderPlanInput = {
  now: Date;
  /** 'HH:mm' */
  time: string;
  /** 오늘 기록이 이미 있는지 */
  hasEntryToday: boolean;
  days?: number;
};

/**
 * 알림을 울릴 시각 목록. 오늘부터 days 일 동안 하루 하나다.
 * 오늘 기록이 있거나 설정 시각이 이미 지났으면 오늘 몫만 뺀다.
 */
export function reminderDates({
  now,
  time,
  hasEntryToday,
  days = REMINDER_WINDOW_DAYS,
}: ReminderPlanInput): Date[] {
  const start = fromDate(now);
  const dates: Date[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    if (offset === 0 && hasEntryToday) continue;
    const at = dateAtTime(addDays(start, offset), time);
    if (at.getTime() > now.getTime()) dates.push(at);
  }
  return dates;
}
