import { addDays, dateAtTime, formatTime, fromDate } from '@/src/utils/date';

export const DEFAULT_REMINDER_TIME = '21:00';
/** 오늘부터 며칠치를 예약할지. iOS 예약 한도(64개) 안이고, 2주 안에 앱을 안 열면 조용해진다 */
export const REMINDER_WINDOW_DAYS = 14;
export const REMINDER_TITLE = '오늘 참은 소비 있나요?';
export const REMINDER_BODY = '커피 한 잔이라도 좋아요. 적어 두면 쌓여요.';
/** 설정 화면에 보이는 기능 이름. 시간은 사용자가 고르므로 "저녁" 을 붙이지 않는다 */
export const REMINDER_LABEL = '매일 기록 알림';
/** 미리 보기 알림이 오기까지 기다리는 시간(초) */
export const REMINDER_TEST_DELAY_S = 5;

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

/**
 * 예약을 다시 맞춘 결과. 화면이 "지금 실제로 어떻게 예약돼 있는지" 를 그대로 보여 주는 데 쓴다.
 * - off: 스위치 꺼짐
 * - denied: 아이폰 설정에서 권한이 꺼짐
 * - failed: 예약을 시도했지만 남은 예약이 없음
 */
export type ReminderPlan = {
  status: 'off' | 'denied' | 'scheduled' | 'failed';
  /** 가장 가까운 알림 시각. 예약이 없으면 null */
  next: Date | null;
  /** 오늘 이미 기록해서 오늘 몫을 뺐는지 */
  skippedToday: boolean;
};

export const REMINDER_PLAN_OFF: ReminderPlan = { status: 'off', next: null, skippedToday: false };

/** '오늘 21:00' · '내일 21:00' · '11월 12일 21:00' */
export function reminderWhenLabel(next: Date, now: Date): string {
  const day = fromDate(next);
  const todayStr = fromDate(now);
  let label = `${next.getMonth() + 1}월 ${next.getDate()}일`;
  if (day === todayStr) label = '오늘';
  else if (day === addDays(todayStr, 1)) label = '내일';
  return `${label} ${formatTime(next)}`;
}

/** 알림 구획 아래 회색 안내 한 줄. 꺼져 있으면 null */
export function reminderStatusText(plan: ReminderPlan, now: Date): string | null {
  if (plan.status === 'off') return null;
  if (plan.status === 'denied') return '아이폰 설정에서 SaveLog 알림이 꺼져 있어요';
  if (plan.status === 'failed' || plan.next === null) {
    return '알림을 예약하지 못했어요. 스위치를 껐다 켜 보세요';
  }
  const when = reminderWhenLabel(plan.next, now);
  return plan.skippedToday ? `오늘은 이미 기록했어요. 다음 알림은 ${when}` : `다음 알림은 ${when}`;
}

/** 스위치를 켠 직후 띄우는 확인 창 문구 */
export function reminderEnabledAlert(
  plan: ReminderPlan,
  time: string,
  now: Date,
): { title: string; message: string } {
  if (plan.status !== 'scheduled' || plan.next === null) {
    return { title: '알림을 예약하지 못했어요', message: '잠시 후 스위치를 껐다 다시 켜 보세요.' };
  }
  const when = reminderWhenLabel(plan.next, now);
  const lines = [
    `매일 ${time}에 알려 드려요.`,
    '그날 이미 기록했으면 울리지 않아요.',
    plan.skippedToday ? `오늘은 이미 기록해서 ${when}부터 울려요.` : `다음 알림은 ${when}이에요.`,
  ];
  return { title: '기록 알림을 켰어요', message: lines.join('\n') };
}
