import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/ko';

dayjs.locale('ko');
// (M5) dayjs(value, format, true) 엄격 파싱에 필요하다. 이 플러그인이 없으면 형식 인자를 무시해 '2026-02-30' 도 통과한다
dayjs.extend(customParseFormat);

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

/** '2026-09-23' → '2026-09' */
export function toMonth(date: string): string {
  return date.slice(0, MONTH_FORMAT.length);
}

/** '2026-09' → '2026년 9월' */
export function formatKoMonth(month: string): string {
  const d = dayjs(`${month}-01`, DATE_FORMAT);
  if (!d.isValid()) return month;
  return d.format('YYYY년 M월');
}

/** 올해를 'YYYY'로 돌려준다. */
export function thisYear(): string {
  return dayjs().format('YYYY');
}

/** '2026-09-23' 또는 '2026-09' → '2026' */
export function toYear(date: string): string {
  return date.slice(0, 'YYYY'.length);
}

/** '2026' → '2026년' */
export function formatKoYear(year: string): string {
  return `${year}년`;
}

/** 'YYYY'에 delta년을 더한다. addYears('2026', -1) → '2025' */
export function addYears(year: string, delta: number): string {
  return String(Number(year) + delta);
}

/** 'YYYY-MM-DD' 또는 'YYYY-MM' → 1~12 (몇 월인지) */
export function monthOfYear(date: string): number {
  return Number(date.slice('YYYY-'.length, 'YYYY-MM'.length));
}

/** '2026' → { start: '2026-01-01', end: '2026-12-31' } */
export function yearRange(year: string): { start: string; end: string } {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

/** 'YYYY-MM-DD' → Date (로컬 자정). DateTimePicker 에 넘길 때 사용. */
export function toDate(date: string): Date {
  const d = dayjs(date, DATE_FORMAT);
  return d.isValid() ? d.toDate() : new Date();
}

/**
 * 기록 날짜로 고를 수 있는 범위: 작년 1월 1일 ~ 오늘 (2026-09-26 사용자 결정: 올해와 작년만, 미래 불가).
 * entryDateBounds('2026-01-01') → { min: '2025-01-01', max: '2026-01-01' }
 */
export function entryDateBounds(base: string = today()): { min: string; max: string } {
  return { min: `${addYears(toYear(base), -1)}-01-01`, max: base };
}

/** 'YYYY-MM-DD' 를 [min, max] 안으로 당긴다. 같은 형식이라 문자열 비교로 충분하다 */
export function clampDate(date: string, min: string, max: string): string {
  if (date < min) return min;
  if (date > max) return max;
  return date;
}

/** Date → 'YYYY-MM-DD' (로컬 기준) */
export function fromDate(d: Date): string {
  return dayjs(d).format(DATE_FORMAT);
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

/** 'YYYY-MM-DD' → 23 (그 달의 며칠인지). 잘못된 값이면 1. */
export function dayOfMonth(date: string): number {
  const d = dayjs(date, DATE_FORMAT);
  return d.isValid() ? d.date() : 1;
}

/** 해당 월의 일 수. daysInMonth('2026-02') → 28 */
export function daysInMonth(month: string): number {
  return dayjs(`${month}-01`, DATE_FORMAT).daysInMonth();
}

/** 현재 시각 ISO8601 문자열 (created_at/updated_at 용) */
export function nowIso(): string {
  return dayjs().format();
}

/** 'YYYY-MM-DD'에 delta일을 더한다. addDays('2026-10-01', -1) → '2026-09-30' */
export function addDays(date: string, delta: number): string {
  return dayjs(date, DATE_FORMAT).add(delta, 'day').format(DATE_FORMAT);
}

/** 그 달 1일의 요일. 0 = 일요일 … 6 = 토요일. firstWeekday('2026-09') → 2 (화) */
export function firstWeekday(month: string): number {
  return dayjs(`${month}-01`, DATE_FORMAT).day();
}

/** 1970-01-01 부터 며칠째인지 (로컬 날짜 기준). 하루에 하나씩 차례로 돌리는 문구의 순번에 쓴다. */
export function dayNumber(date: string): number {
  return dayjs(date, DATE_FORMAT).diff(dayjs('1970-01-01', DATE_FORMAT), 'day');
}

/** (M5) 'YYYY-MM-DD' 이면서 실제로 있는 날짜인지 (엄격 파싱: '2026-02-30' · '2026-9-1' 은 false). 백업 복원 검증용 */
export function isValidDateString(value: string): boolean {
  return dayjs(value, DATE_FORMAT, true).isValid();
}

/** (M5) 파일 이름에 넣는 현재 시각 '2026-09-25-135800' (자동 백업이 같은 날 여러 번이어도 겹치지 않게) */
export function fileTimestamp(): string {
  return dayjs().format('YYYY-MM-DD-HHmmss');
}
