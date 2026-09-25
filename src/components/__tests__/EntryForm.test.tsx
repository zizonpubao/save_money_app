import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { EntryForm } from '@/src/components/EntryForm';
import { EntryFormModal } from '@/src/components/EntryFormModal';
import type { Category } from '@/src/db';
import { useEntryForm } from '@/src/features/useEntryForm';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

const 커피: Category = { id: 1, name: '커피', emoji: '☕', sortOrder: 0, isDefault: true };
const 택시: Category = { id: 2, name: '택시', emoji: '🚕', sortOrder: 1, isDefault: true };
const CATEGORIES = [커피, 택시];

const AMOUNT = '0'; // 금액 입력 placeholder
const TITLE = '예: 아메리카노'; // 항목명 입력 placeholder

/** 저장 버튼은 모달 헤더에 있으므로 모달째로 띄운다. */
async function renderModal(onSubmit = jest.fn()) {
  await render(
    <EntryFormModal visible categories={CATEGORIES} onSubmit={onSubmit} onClose={jest.fn()} />,
  );
  return onSubmit;
}

/** 폼 단독 렌더용: 실제 useEntryForm 을 물린다. */
function Harness() {
  const form = useEntryForm();
  return <EntryForm form={form} categories={CATEGORIES} />;
}

describe('EntryForm (입력 시트)', () => {
  describe('저장 버튼 비활성 조건', () => {
    it('빈 폼이면 저장 버튼이 비활성이다', async () => {
      await renderModal();
      expect(screen.getByText('저장')).toBeDisabled();
    });

    it('금액이 0이면 항목명이 있어도 저장 버튼이 비활성이다', async () => {
      await renderModal();
      await fireEvent.changeText(screen.getByPlaceholderText(AMOUNT), '0');
      await fireEvent.changeText(screen.getByPlaceholderText(TITLE), '아메리카노');
      expect(screen.getByText('저장')).toBeDisabled();
    });

    it('항목명이 공백뿐이면 금액이 있어도 저장 버튼이 비활성이다', async () => {
      await renderModal();
      await fireEvent.changeText(screen.getByPlaceholderText(AMOUNT), '4500');
      await fireEvent.changeText(screen.getByPlaceholderText(TITLE), '   ');
      expect(screen.getByText('저장')).toBeDisabled();
    });

    it('금액과 항목명이 모두 있으면 저장 버튼이 켜지고 누르면 입력값이 넘어간다', async () => {
      const onSubmit = await renderModal();
      await fireEvent.changeText(screen.getByPlaceholderText(AMOUNT), '4500');
      await fireEvent.changeText(screen.getByPlaceholderText(TITLE), '아메리카노');
      expect(screen.getByText('저장')).toBeEnabled();

      await fireEvent.press(screen.getByText('저장'));
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ title: '아메리카노', amount: 4500 }),
      );
    });

    it('비활성 저장 버튼을 눌러도 onSubmit 이 불리지 않는다', async () => {
      const onSubmit = await renderModal();
      await fireEvent.press(screen.getByText('저장'));
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('카테고리 칩 자동 채움', () => {
    it('항목명이 비어 있을 때 칩을 고르면 카테고리명으로 채워진다', async () => {
      await render(<Harness />);
      await fireEvent.press(screen.getByText('☕ 커피'));
      expect(screen.getByPlaceholderText(TITLE)).toHaveDisplayValue('커피');
    });

    it('항목명이 이미 있으면 칩을 골라도 덮어쓰지 않는다', async () => {
      await render(<Harness />);
      await fireEvent.changeText(screen.getByPlaceholderText(TITLE), '아메리카노');
      await fireEvent.press(screen.getByText('☕ 커피'));
      expect(screen.getByPlaceholderText(TITLE)).toHaveDisplayValue('아메리카노');
    });
  });

  describe('금액 자동 콤마', () => {
    it('12000 을 치면 입력칸에 12,000 으로 보인다', async () => {
      await render(<Harness />);
      await fireEvent.changeText(screen.getByPlaceholderText(AMOUNT), '12000');
      expect(screen.getByPlaceholderText(AMOUNT)).toHaveDisplayValue('12,000');
    });

    it('콤마가 붙은 상태에서 한 자리 더 치면 다시 묶는다 (12,0005 → 120,005)', async () => {
      await render(<Harness />);
      await fireEvent.changeText(screen.getByPlaceholderText(AMOUNT), '12,0005');
      expect(screen.getByPlaceholderText(AMOUNT)).toHaveDisplayValue('120,005');
    });
  });

  it('날짜 칸은 오늘 날짜를 "YYYY년 M월 D일 (요일)" 형식으로 보여준다', async () => {
    await render(<Harness />);
    expect(
      screen.getByText(/^\d{4}년 \d{1,2}월 \d{1,2}일 \([일월화수목금토]\)$/),
    ).toBeOnTheScreen();
  });

  describe('(M4.5) 금액 프리셋 칩', () => {
    beforeEach(() => jest.mocked(Haptics.selectionAsync).mockClear());

    it('금액 칸 아래에 3천 · 4.5천 · 1만 · 2만 · +1천 칩이 있다', async () => {
      await render(<Harness />);
      for (const label of ['3천', '4.5천', '1만', '2만', '+1천']) {
        expect(screen.getByText(label)).toBeOnTheScreen();
      }
    });

    it('값 칩은 금액을 그 값으로 바꾸고(콤마) selection 햅틱을 낸다', async () => {
      await render(<Harness />);
      await fireEvent.changeText(screen.getByPlaceholderText(AMOUNT), '12000');
      await fireEvent.press(screen.getByLabelText('금액 4,500원으로'));
      expect(screen.getByPlaceholderText(AMOUNT)).toHaveDisplayValue('4,500');
      await fireEvent.press(screen.getByText('2만'));
      expect(screen.getByPlaceholderText(AMOUNT)).toHaveDisplayValue('20,000');
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(2);
    });

    it('"+1천" 은 지금 금액에 1,000원을 더한다 (빈 칸 → 1,000 → 2,000, 9,500 → 10,500)', async () => {
      await render(<Harness />);
      await fireEvent.press(screen.getByLabelText('금액에 1,000원 더하기'));
      expect(screen.getByPlaceholderText(AMOUNT)).toHaveDisplayValue('1,000');
      await fireEvent.press(screen.getByText('+1천'));
      expect(screen.getByPlaceholderText(AMOUNT)).toHaveDisplayValue('2,000');
      await fireEvent.changeText(screen.getByPlaceholderText(AMOUNT), '9500');
      await fireEvent.press(screen.getByText('+1천'));
      expect(screen.getByPlaceholderText(AMOUNT)).toHaveDisplayValue('10,500');
    });

    it('프리셋으로 채운 금액이 저장 값으로 넘어간다', async () => {
      const onSubmit = await renderModal();
      await fireEvent.press(screen.getByText('3천'));
      await fireEvent.press(screen.getByText('+1천'));
      await fireEvent.changeText(screen.getByPlaceholderText(TITLE), '간식');
      await fireEvent.press(screen.getByText('저장'));
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: '간식', amount: 4000 }));
    });
  });

  describe('(M4.5) 금액 칸 자동 포커스', () => {
    it('새 기록 모달은 열리자마자 금액 칸에 포커스한다 (autoFocus)', async () => {
      await renderModal();
      expect(screen.getByTestId('amount-input').props.autoFocus).toBe(true);
    });

    it('수정 화면처럼 autoFocusAmount 를 안 넘기면 포커스하지 않는다', async () => {
      await render(<Harness />);
      expect(screen.getByTestId('amount-input').props.autoFocus).toBe(false);
    });
  });
});
