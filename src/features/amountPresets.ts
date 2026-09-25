import { formatWon } from '@/src/utils/money';

/**
 * (M4.5) 입력 시트 금액 프리셋 칩. 누를 때마다 지금 금액에 더하는 누적 방식이다
 * (아이폰 실사용에서 "설정" 방식보다 1천+500 같은 조합이 빨랐다). 지우기는 키패드 백스페이스.
 * 선택 상태가 없는 동작 버튼이다.
 */
export type AmountPreset = number;

export const AMOUNT_PRESETS: readonly AmountPreset[] = [500, 1000, 3000, 5000, 10000];

/** 금액 입력칸 maxLength(13, 콤마 포함)에 들어가는 최댓값. 더하기로 이보다 커지면 그대로 둔다 */
export const MAX_INPUT_AMOUNT = 9_999_999_999;

/** 칩 글자: 500 → "500원", 3000 → "3천", 10000 → "1만" */
export function presetLabel(value: AmountPreset): string {
  if (value >= 10000 && value % 10000 === 0) return `${value / 10000}만`;
  if (value >= 1000 && value % 1000 === 0) return `${value / 1000}천`;
  return `${value}원`;
}

/** 스크린리더 문구: "금액에 1,000원 더하기" */
export function presetA11yLabel(value: AmountPreset): string {
  return `금액에 ${formatWon(value)} 더하기`;
}

/** 프리셋을 지금 금액에 더한 새 금액. 입력칸 최대를 넘으면 그대로 둔다 */
export function applyAmountPreset(current: number, value: AmountPreset): number {
  const next = current + value;
  return next > MAX_INPUT_AMOUNT ? current : next;
}
