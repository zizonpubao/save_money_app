import { useCallback, useMemo, useState } from 'react';

import type { Category, EntryInput, RecentTitle } from '@/src/db';
import { today } from '@/src/utils/date';
import { formatAmountInput, formatNumber, parseWon } from '@/src/utils/money';

export type EntryFormValues = {
  amountText: string; // 콤마 포함 표시용 문자열
  title: string;
  categoryId: number | null;
  date: string; // 'YYYY-MM-DD'
  memo: string;
};

function fromInitial(initial?: EntryInput | null): EntryFormValues {
  return {
    amountText: initial && initial.amount > 0 ? formatNumber(initial.amount) : '',
    title: initial?.title ?? '',
    categoryId: initial?.categoryId ?? null,
    date: initial?.date ?? today(),
    memo: initial?.memo ?? '',
  };
}

/**
 * 입력/수정 폼 상태. 화면은 이 훅이 주는 값과 setter 만 쓴다.
 * initial 이 있으면 수정 모드로 채워서 시작한다.
 */
export function useEntryForm(initial?: EntryInput | null) {
  const [values, setValues] = useState<EntryFormValues>(() => fromInitial(initial));

  const setAmountText = useCallback((text: string) => {
    setValues((v) => ({ ...v, amountText: formatAmountInput(text) }));
  }, []);

  const setTitle = useCallback((title: string) => {
    setValues((v) => ({ ...v, title }));
  }, []);

  const setDate = useCallback((date: string) => {
    setValues((v) => ({ ...v, date }));
  }, []);

  const setMemo = useCallback((memo: string) => {
    setValues((v) => ({ ...v, memo }));
  }, []);

  /** 칩 선택. 같은 칩을 다시 누르면 해제. 항목명이 비어 있으면 카테고리명으로 채운다. */
  const selectCategory = useCallback((category: Category) => {
    setValues((v) => {
      const deselect = v.categoryId === category.id;
      return {
        ...v,
        categoryId: deselect ? null : category.id,
        title: !deselect && v.title.trim() === '' ? category.name : v.title,
      };
    });
  }, []);

  /**
   * (M4) 빠른 입력 칩. 항목명·카테고리·금액을 그 기록 값으로 채운다.
   * 사용자가 칩을 직접 눌렀으므로 이미 입력한 값이 있어도 덮어쓴다. 날짜·메모는 그대로 둔다.
   */
  const applyRecent = useCallback((recent: RecentTitle) => {
    setValues((v) => ({
      ...v,
      title: recent.title,
      categoryId: recent.categoryId,
      amountText: formatAmountInput(String(recent.amount)),
    }));
  }, []);

  const reset = useCallback((next?: EntryInput | null) => {
    setValues(fromInitial(next));
  }, []);

  const amount = parseWon(values.amountText);
  const canSave = amount > 0 && values.title.trim() !== '';

  const toInput = useMemo(
    () => (): EntryInput => ({
      date: values.date,
      title: values.title.trim(),
      amount,
      categoryId: values.categoryId,
      memo: values.memo.trim() === '' ? null : values.memo.trim(),
    }),
    [values, amount],
  );

  return {
    values,
    amount,
    canSave,
    setAmountText,
    setTitle,
    setDate,
    setMemo,
    selectCategory,
    applyRecent,
    reset,
    toInput,
  };
}
