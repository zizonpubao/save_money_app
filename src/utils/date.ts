import dayjs from 'dayjs';
import 'dayjs/locale/ko';

dayjs.locale('ko');

export const DATE_FORMAT = 'YYYY-MM-DD';
export const MONTH_FORMAT = 'YYYY-MM';

/** 오늘 날짜(로컬)를 'YYYY-MM-DD'로 돌려준다. */
export function today(): string {
  return dayjs().format(DATE_FORMAT);
}

/** 이번 달을 'YYYY-MM'으로 돌려준다. */
export function thisMonth(): string {
  return dayjs().format(MONTH_FORMAT);
}

/** '2026-09-23' → '2026년 9월 23일 (수)' */
export function formatKoDate(date: string): string {
  const d = dayjs(date, DATE_FORMAT);
  if (!d.isValid()) return date;
  return d.format('YYYY년 M월 D일 (dd)');
}

/** '2026-09' → '2026년 9월' */
export function formatKoMonth(month: string): string {
  const d = dayjs(`${month}-01`, DATE_FORMAT);
  if (!d.isValid()) return month;
  return d.format('YYYY년 M월');
}

/** '2026-09' → { start: '2026-09-01', end: '2026-09-30' } */
export function monthRange(month: string): { start: string; end: string } {
  const d = dayjs(`${month}-01`, DATE_FORMAT);
  return {
    start: d.startOf('month').format(DATE_FORMAT),
    end: d.endOf('month').format(DATE_FORMAT),
  };
}

/** 'YYYY-MM'에 delta개월을 더한다. addMonths('2026-01', -1) → '2025-12' */
export function addMonths(month: string, delta: number): string {
  return dayjs(`${month}-01`, DATE_FORMAT).add(delta, 'month').format(MONTH_FORMAT);
}

/** 해당 월의 일 수. daysInMonth('2026-02') → 28 */
export function daysInMonth(month: string): number {
  return dayjs(`${month}-01`, DATE_FORMAT).daysInMonth();
}

/** 현재 시각 ISO8601 문자열 (created_at/updated_at 용) */
export function nowIso(): string {
  return dayjs().format();
}
