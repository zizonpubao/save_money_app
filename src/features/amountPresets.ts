import { formatWon } from '@/src/utils/money';

/**
 * (M4.5) 입력 시트 금액 프리셋 칩. 누를 때마다 지금 금액에 더하는 누적 방식이다
 * (아이폰 실사용에서 "설정" 방식보다 1천+500 같은 조합이 빨랐다). 지우기는 키패드 백스페이스.
 * 선택 상태가 없는 동작 버튼이다. 맨 앞 부호 칩을 − 로 바꾸면 같은 칩이 빼기가 된다.
 * 칩 5개 값은 설정 탭에서 바꿀 수 있다 (settings 키 amount_presets).
 */
export type AmountPreset = number;
/** 프리셋 칩이 더할지 뺄지. 기본 + */
export type PresetSign = '+' | '-';

/** 기본 프리셋. 설정 값이 없거나 망가졌으면 이 값을 쓴다 */
export const AMOUNT_PRESETS: readonly AmountPreset[] = [500, 1000, 3000, 5000, 10000];

/** 사용자 프리셋 규칙: 정확히 5개, 100원 단위, 100 ~ 1,000,000 */
export const PRESET_COUNT = 5;
export const PRESET_MIN = 100;
export const PRESET_MAX = 1_000_000;
export const PRESET_UNIT = 100;

/** 금액 입력칸 maxLength(13, 콤마 포함)에 들어가는 최댓값. 더하기로 이보다 커지면 그대로 둔다 */
export const MAX_INPUT_AMOUNT = 9_999_999_999;

/** 소수 첫째 자리까지 버림, ".0" 은 뗀다. 칩 글자가 실제보다 크게 보이지 않도록 반올림하지 않는다 */
function shortNumber(value: number, unit: number): string {
  // value/unit*10 대신 (value*10)/unit 로 계산해 1.1*10 = 11.000000000000002 같은 부동소수 오차를 피한다
  return String(Math.floor((value * 10) / unit) / 10);
}

/**
 * 칩 글자: 500 → "5백", 1500 → "1.5천", 10000 → "1만", 25000 → "2.5만", 12300 → "1.2만"(버림).
 * 100 미만은 단위 없이 "50원" (설정 검증이 막지만 기본 방어)
 */
export function presetLabel(value: AmountPreset): string {
  if (value >= 10000) return `${shortNumber(value, 10000)}만`;
  if (value >= 1000) return `${shortNumber(value, 1000)}천`;
  if (value >= 100) return `${shortNumber(value, 100)}백`;
  return `${value}원`;
}

/** 스크린리더 문구: "금액에 1,000원 더하기" / "금액에 1,000원 빼기" */
export function presetA11yLabel(value: AmountPreset, sign: PresetSign = '+'): string {
  return `금액에 ${formatWon(value)} ${sign === '+' ? '더하기' : '빼기'}`;
}

/** 프리셋을 지금 금액에 더하거나 뺀 새 금액. 더해서 입력칸 최대를 넘으면 그대로, 빼서 0 미만이면 0 */
export function applyAmountPreset(
  current: number,
  value: AmountPreset,
  sign: PresetSign = '+',
): number {
  if (sign === '-') return Math.max(0, current - value);
  const next = current + value;
  return next > MAX_INPUT_AMOUNT ? current : next;
}

export function togglePresetSign(sign: PresetSign): PresetSign {
  return sign === '+' ? '-' : '+';
}

/** 설정 목록 미리보기: "5백 · 1천 · 3천 · 5천 · 1만" */
export function presetsPreview(values: readonly AmountPreset[]): string {
  return values.map(presetLabel).join(' · ');
}

export type PresetValidation = { ok: boolean; errors: string[] };

export const PRESET_ERRORS = {
  count: '금액 5개를 모두 입력해 주세요',
  integer: '정수로 입력해 주세요',
  range: '100원부터 1,000,000원까지 입력할 수 있습니다',
  unit: '100원 단위로 입력해 주세요',
  duplicate: '같은 금액은 한 번만 넣을 수 있습니다',
} as const;

/**
 * 프리셋 5개 검사. 틀린 규칙마다 문구 하나씩(같은 규칙은 한 번만), 정해진 순서대로.
 * 정렬은 하지 않는다 — 사용자가 넣은 순서대로 칩이 선다.
 * null 은 빈 칸이라 개수 규칙으로만 잡는다 (0 으로 보면 범위 문구가 먼저 떠 헷갈린다)
 */
export function validatePresets(values: readonly (number | null)[]): PresetValidation {
  const errors: string[] = [];
  const filled = values.filter((v): v is number => v !== null);
  if (values.length !== PRESET_COUNT || filled.length !== PRESET_COUNT) errors.push(PRESET_ERRORS.count);
  if (filled.some((v) => !Number.isInteger(v))) errors.push(PRESET_ERRORS.integer);
  if (filled.some((v) => v < PRESET_MIN || v > PRESET_MAX)) errors.push(PRESET_ERRORS.range);
  if (filled.some((v) => Number.isInteger(v) && v % PRESET_UNIT !== 0)) errors.push(PRESET_ERRORS.unit);
  if (new Set(filled).size !== filled.length) errors.push(PRESET_ERRORS.duplicate);
  return { ok: errors.length === 0, errors };
}

/** settings 값(JSON 배열 문자열)을 읽는다. 없거나, 파싱이 안 되거나, 규칙에 어긋나면 기본값 */
export function parseAmountPresets(raw: string | null): AmountPreset[] {
  if (raw === null) return [...AMOUNT_PRESETS];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.every((v): v is number => typeof v === 'number') &&
      validatePresets(parsed).ok
    ) {
      return parsed;
    }
  } catch {
    // 망가진 값은 기본값으로 덮어 보여 준다 (DB 값은 다음 저장 때 바뀐다)
  }
  return [...AMOUNT_PRESETS];
}

export function serializeAmountPresets(values: readonly AmountPreset[]): string {
  return JSON.stringify(values);
}
