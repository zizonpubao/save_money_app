import { useState } from 'react';

import { formatAmountInput, formatNumber, parseWon } from '@/src/utils/money';

import { isValidGoal } from './goal';

/** 월 목표 입력 모달 상태. 입력 필드와 프리셋 칩이 같은 문자열을 고친다. */
export function useGoalForm(initial: number | null) {
  const [amountText, setAmountTextRaw] = useState(() =>
    initial !== null ? formatNumber(initial) : '',
  );
  const amount = parseWon(amountText);

  return {
    amountText,
    amount,
    /** 타이핑할 때마다 콤마 형식으로 다시 맞춘다 (기록 입력 금액 필드와 같은 규칙) */
    setAmountText: (text: string) => setAmountTextRaw(formatAmountInput(text)),
    pickPreset: (preset: number) => setAmountTextRaw(formatNumber(preset)),
    canSave: isValidGoal(amount),
  };
}
