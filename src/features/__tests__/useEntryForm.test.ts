import { act, renderHook } from '@testing-library/react-native';

import type { Category, EntryInput } from '@/src/db';
import { AMOUNT_PRESETS } from '@/src/features/amountPresets';
import { useEntryForm } from '@/src/features/useEntryForm';
import { addDays, entryDateBounds, today } from '@/src/utils/date';

const 커피: Category = { id: 1, name: '커피', emoji: '☕', sortOrder: 0, isDefault: true };
const 밥값: Category = { id: 2, name: '밥값', emoji: '🍚', sortOrder: 1, isDefault: true };

function setup(initial?: EntryInput | null) {
  return renderHook(() => useEntryForm(initial));
}

describe('useEntryForm', () => {
  describe('초기값', () => {
    it('새 기록은 빈 폼에 오늘 날짜로 시작한다', async () => {
      const { result } = await setup();
      expect(result.current.values).toMatchObject({ amountText: '', title: '', date: today() });
    });

    it('수정 모드는 기존 값으로 채워지고 금액에 콤마가 붙는다', async () => {
      const { result } = await setup({
        date: '2026-09-01',
        title: '아메리카노',
        amount: 4500,
        categoryId: 1,
        memo: '참았다',
      });
      expect(result.current.values.amountText).toBe('4,500');
      expect(result.current.values.title).toBe('아메리카노');
      expect(result.current.values.categoryId).toBe(1);
    });
  });

  describe('금액 입력', () => {
    it('숫자를 치면 천 단위 콤마가 붙는다', async () => {
      const { result } = await setup();
      await act(() => result.current.setAmountText('12000'));
      expect(result.current.values.amountText).toBe('12,000');
      expect(result.current.amount).toBe(12000);
    });

    it('0만 치면 빈 문자열로 남아 placeholder 가 보인다', async () => {
      const { result } = await setup();
      await act(() => result.current.setAmountText('0'));
      expect(result.current.values.amountText).toBe('');
      expect(result.current.amount).toBe(0);
    });
  });

  describe('카테고리 칩', () => {
    it('칩을 고르면 비어 있던 항목명이 카테고리명으로 자동 채워진다', async () => {
      const { result } = await setup();
      await act(() => result.current.selectCategory(커피));
      expect(result.current.values.title).toBe('커피');
      expect(result.current.values.categoryId).toBe(1);
    });

    it('이미 항목명을 적었으면 칩을 골라도 덮어쓰지 않는다', async () => {
      const { result } = await setup();
      await act(() => result.current.setTitle('편의점 도시락'));
      await act(() => result.current.selectCategory(밥값));
      expect(result.current.values.title).toBe('편의점 도시락');
      expect(result.current.values.categoryId).toBe(2);
    });

    it('같은 칩을 다시 누르면 선택이 풀리고 자동 채운 항목명은 남는다', async () => {
      const { result } = await setup();
      await act(() => result.current.selectCategory(커피));
      await act(() => result.current.selectCategory(커피));
      expect(result.current.values.categoryId).toBeNull();
      expect(result.current.values.title).toBe('커피');
    });

    it('다른 칩을 누르면 선택이 그쪽으로 옮겨간다', async () => {
      const { result } = await setup();
      await act(() => result.current.selectCategory(커피));
      await act(() => result.current.selectCategory(밥값));
      expect(result.current.values.categoryId).toBe(2);
    });
  });

  describe('저장 버튼 활성 조건', () => {
    it('빈 폼에서는 저장할 수 없다', async () => {
      const { result } = await setup();
      expect(result.current.canSave).toBe(false);
    });

    it('금액만 있고 항목명이 비면 저장할 수 없다', async () => {
      const { result } = await setup();
      await act(() => result.current.setAmountText('4500'));
      expect(result.current.canSave).toBe(false);
    });

    it('항목명이 공백뿐이면 저장할 수 없다', async () => {
      const { result } = await setup();
      await act(() => result.current.setAmountText('4500'));
      await act(() => result.current.setTitle('   '));
      expect(result.current.canSave).toBe(false);
    });

    it('항목명만 있고 금액이 0이면 저장할 수 없다', async () => {
      const { result } = await setup();
      await act(() => result.current.setTitle('아메리카노'));
      expect(result.current.canSave).toBe(false);
    });

    it('금액과 항목명이 모두 있으면 저장할 수 있다', async () => {
      const { result } = await setup();
      await act(() => result.current.setAmountText('4500'));
      await act(() => result.current.setTitle('아메리카노'));
      expect(result.current.canSave).toBe(true);
    });
  });

  describe('toInput', () => {
    it('항목명 앞뒤 공백을 잘라 EntryInput 으로 만든다', async () => {
      const { result } = await setup();
      await act(() => result.current.setAmountText('4,500'));
      await act(() => result.current.setTitle('  아메리카노  '));
      await act(() => result.current.setDate('2026-09-01'));
      expect(result.current.toInput()).toEqual({
        date: '2026-09-01',
        title: '아메리카노',
        amount: 4500,
        categoryId: null,
        memo: null,
      });
    });

    it('메모가 공백뿐이면 null 로 저장한다', async () => {
      const { result } = await setup();
      await act(() => result.current.setAmountText('4500'));
      await act(() => result.current.setTitle('아메리카노'));
      await act(() => result.current.setMemo('   '));
      expect(result.current.toInput().memo).toBeNull();
    });
  });

  describe('reset', () => {
    it('reset() 은 폼을 오늘 날짜의 빈 상태로 되돌린다', async () => {
      const { result } = await setup();
      await act(() => result.current.setAmountText('4500'));
      await act(() => result.current.setTitle('아메리카노'));
      await act(() => result.current.reset());
      expect(result.current.values).toEqual({
        amountText: '',
        title: '',
        categoryId: null,
        date: today(),
        memo: '',
      });
    });
  });

  describe('(M4.5) 금액 프리셋', () => {
    const [오백, 천, , , 만] = AMOUNT_PRESETS;

    it('칩은 누를 때마다 금액에 더하고 콤마를 붙인다: 1천 → 500원 → 1만 ×2 = 21,500', async () => {
      const { result } = await setup();
      await act(() => result.current.applyPreset(천!));
      expect(result.current.values.amountText).toBe('1,000');
      await act(() => result.current.applyPreset(오백!));
      expect(result.current.values.amountText).toBe('1,500');
      await act(() => result.current.applyPreset(만!));
      await act(() => result.current.applyPreset(만!));
      expect(result.current.values.amountText).toBe('21,500');
      expect(result.current.amount).toBe(21500);
    });

    it('직접 입력한 금액에도 이어서 더한다 (4,500 + 1천 = 5,500)', async () => {
      const { result } = await setup();
      await act(() => result.current.setAmountText('4500'));
      await act(() => result.current.applyPreset(천!));
      expect(result.current.values.amountText).toBe('5,500');
    });
  });

  describe('날짜 범위 (작년 1월 1일 ~ 오늘)', () => {
    it('범위 안 날짜는 그대로 들어간다 (작년 1월 1일 포함)', async () => {
      const { min } = entryDateBounds();
      const { result } = await setup();
      await act(() => result.current.setDate(min));
      expect(result.current.values.date).toBe(min);
    });

    it('작년 1월 1일보다 이전이면 작년 1월 1일로 당긴다', async () => {
      const { min } = entryDateBounds();
      const { result } = await setup();
      await act(() => result.current.setDate(addDays(min, -1)));
      expect(result.current.values.date).toBe(min);
      await act(() => result.current.setDate('2000-01-01'));
      expect(result.current.values.date).toBe(min);
    });

    it('미래 날짜는 오늘로 당긴다', async () => {
      const { result } = await setup();
      await act(() => result.current.setDate(addDays(today(), 1)));
      expect(result.current.values.date).toBe(today());
    });

    it('수정 화면의 기존 날짜는 범위 밖이어도 그대로 둔다 (데이터 불변) · 저장 값도 그대로', async () => {
      const old = addDays(entryDateBounds().min, -400);
      const { result } = await setup({ date: old, title: '옛날', amount: 1000, categoryId: null, memo: null });
      expect(result.current.values.date).toBe(old);
      expect(result.current.toInput().date).toBe(old);
    });
  });
});
