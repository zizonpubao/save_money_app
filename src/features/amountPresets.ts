import { formatWon } from '@/src/utils/money';

/**
 * (M4.5) 입력 시트 금액 프리셋 칩. 앞 4개는 금액을 그 값으로 바꾸고, 마지막 하나는 지금 금액에 더한다.
 * 선택 상태가 없는 동작 버튼이다.
 */
export type AmountPreset = { kind: 'set' | 'add'; value: number };

export const AMOUNT_PRESETS: readonly AmountPreset[] = [
  { kind: 'set', value: 3000 },
  { kind: 'set', value: 4500 },
  { kind: 'set', value: 10000 },
  { kind: 'set', value: 20000 },
  { kind: 'add', value: 1000 },
];

/** 금액 입력칸 maxLength(13, 콤마 포함)에 들어가는 최댓값. 더하기로 이보다 커지면 그대로 둔다 */
export const MAX_INPUT_AMOUNT = 9_999_999_999;

/** 칩 글자: 3000 → "3천", 4500 → "4.5천", 10000 → "1만", 더하기는 앞에 "+" */
export function presetLabel(preset: AmountPreset): string {
  const { value } = preset;
  const body =
    value >= 10000 && value % 10000 === 0 ? `${value / 10000}만` : `${value / 1000}천`;
  return preset.kind === 'add' ? `+${body}` : body;
}

/** 스크린리더 문구: "금액 3,000원으로" / "금액에 1,000원 더하기" */
export function presetA11yLabel(preset: AmountPreset): string {
  return preset.kind === 'add'
    ? `금액에 ${formatWon(preset.value)} 더하기`
    : `금액 ${formatWon(preset.value)}으로`;
}

/** 프리셋을 적용한 새 금액 */
export function applyAmountPreset(current: number, preset: AmountPreset): number {
  if (preset.kind === 'set') return preset.value;
  const next = current + preset.value;
  return next > MAX_INPUT_AMOUNT ? current : next;
}
