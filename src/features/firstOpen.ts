/**
 * 오늘 홈을 처음 여는가. 마지막으로 연 날(settings last_open_date)이 오늘과 다르면 처음이다.
 * 키가 없으면(앱 첫 설치, 업데이트 직후) 처음으로 본다.
 */
export function isFirstOpenOfDay(lastOpenDate: string | null, today: string): boolean {
  return lastOpenDate !== today;
}
