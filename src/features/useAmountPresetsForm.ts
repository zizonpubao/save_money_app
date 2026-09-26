import { useState } from 'react';

import { formatAmountInput, formatNumber, parseWon } from '@/src/utils/money';

import {
  PRESET_MAX,
  PRESET_MIN,
  PRESET_UNIT,
  validatePresets,
  type AmountPreset,
} from './amountPresets';

/** 한 칸이 규칙에 어긋나는지 (빈 칸 · 범위 · 100원 단위 · 앞 칸과 중복). 테두리 표시용 */
export function isPresetFieldInvalid(values: readonly (number | null)[], index: number): boolean {
  const v = values[index];
  if (v === undefined || v === null) return true;
  if (v < PRESET_MIN || v > PRESET_MAX || v % PRESET_UNIT !== 0) return true;
  return values.indexOf(v) !== index;
}

/**
 * 설정 "빠른 금액 버튼" 모달 상태. 5칸 문자열(콤마 표시)과 검사 결과.
 * 오류 문구는 저장을 한 번 누르거나 칸을 벗어난 뒤부터 보인다 — 1500 을 치는 동안 "1" "15" 에서
 * 범위 문구가 깜빡이지 않게.
 */
export function useAmountPresetsForm(initial: readonly AmountPreset[]) {
  const [texts, setTexts] = useState<string[]>(() => initial.map((v) => formatNumber(v)));
  const [showErrors, setShowErrors] = useState(false);

  // 빈 칸은 0 이 아니라 null 이라야 "5개 모두 입력" 문구가 먼저 나온다
  const values = texts.map((t) => (t.trim() === '' ? null : parseWon(t)));
  const { ok, errors } = validatePresets(values);

  return {
    texts,
    values,
    ok,
    errors: showErrors ? errors : [],
    /** 타이핑할 때마다 콤마 형식으로 다시 맞춘다 (기록 입력 금액 필드와 같은 규칙) */
    setText: (index: number, text: string) =>
      setTexts((prev) => prev.map((t, i) => (i === index ? formatAmountInput(text) : t))),
    isInvalid: (index: number) => showErrors && isPresetFieldInvalid(values, index),
    revealErrors: () => setShowErrors(true),
    /** 저장할 값. 규칙에 어긋나면 null 이고 오류 문구를 켠다 */
    submit: (): AmountPreset[] | null => {
      setShowErrors(true);
      return ok ? values.filter((v): v is number => v !== null) : null;
    },
  };
}
