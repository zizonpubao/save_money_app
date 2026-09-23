import { fireEvent, render, screen } from '@testing-library/react-native';

import { EntryForm } from '@/src/components/EntryForm';
import { EntryFormModal } from '@/src/components/EntryFormModal';
import {
  addEntry,
  getAllCategories,
  initDatabase,
  resetDatabaseConnection,
  type Category,
  type RecentTitle,
} from '@/src/db';
import { useEntryForm } from '@/src/features/useEntryForm';
import { today } from '@/src/utils/date';

const 커피: Category = { id: 1, name: '커피', emoji: '☕', sortOrder: 0, isDefault: true };
const 택시: Category = { id: 2, name: '택시', emoji: '🚕', sortOrder: 1, isDefault: true };
const CATEGORIES = [커피, 택시];

const AMOUNT = '0';
const TITLE = '예: 아메리카노';

function Harness({ recent }: { recent: RecentTitle[] }) {
  const form = useEntryForm();
  return <EntryForm form={form} categories={CATEGORIES} recent={recent} />;
}

describe('빠른 입력 칩 (M4)', () => {
  it('최근 항목을 카테고리 이모지와 함께 칩으로 보여준다', async () => {
    await render(
      <Harness
        recent={[
          { title: '아메리카노', categoryId: 1, amount: 4500 },
          { title: '야근 택시', categoryId: 2, amount: 18000 },
          { title: '편의점', categoryId: null, amount: 3000 },
        ]}
      />,
    );
    expect(screen.getByText('최근 항목')).toBeOnTheScreen();
    expect(screen.getByText('☕ 아메리카노')).toBeOnTheScreen();
    expect(screen.getByText('🚕 야근 택시')).toBeOnTheScreen();
    // 카테고리가 없으면 항목명만
    expect(screen.getByText('편의점')).toBeOnTheScreen();
  });

  it('기록이 없으면 칩 줄째로 숨긴다', async () => {
    await render(<Harness recent={[]} />);
    expect(screen.queryByText('최근 항목')).toBeNull();
    expect(screen.queryByTestId('quick-entry-chips')).toBeNull();
  });

  it('칩을 누르면 항목명·카테고리·마지막 금액이 채워진다', async () => {
    await render(<Harness recent={[{ title: '아메리카노', categoryId: 1, amount: 4500 }]} />);
    await fireEvent.press(screen.getByText('☕ 아메리카노'));
    expect(screen.getByPlaceholderText(TITLE)).toHaveDisplayValue('아메리카노');
    expect(screen.getByPlaceholderText(AMOUNT)).toHaveDisplayValue('4,500');
    expect(screen.getByRole('button', { name: '☕ 커피' })).toBeSelected();
  });

  it('이미 입력한 값이 있어도 칩 값으로 덮어쓴다 (카테고리 없는 칩은 카테고리를 비운다)', async () => {
    await render(<Harness recent={[{ title: '편의점', categoryId: null, amount: 3000 }]} />);
    await fireEvent.changeText(screen.getByPlaceholderText(AMOUNT), '12000');
    await fireEvent.changeText(screen.getByPlaceholderText(TITLE), '택시');
    await fireEvent.press(screen.getByText('🚕 택시'));
    await fireEvent.press(screen.getByText('편의점'));
    expect(screen.getByPlaceholderText(TITLE)).toHaveDisplayValue('편의점');
    expect(screen.getByPlaceholderText(AMOUNT)).toHaveDisplayValue('3,000');
    expect(screen.getByRole('button', { name: '🚕 택시' })).not.toBeSelected();
  });
});

describe('입력 모달의 빠른 입력 (DB)', () => {
  beforeEach(() => {
    resetDatabaseConnection();
    initDatabase();
  });

  afterAll(() => {
    resetDatabaseConnection();
  });

  it('새 기록 모달은 최근 기록을 칩으로 띄우고, 누른 뒤 저장하면 그 값이 넘어간다', async () => {
    const categories = getAllCategories();
    const coffee = categories.find((c) => c.name === '커피');
    addEntry({ date: today(), title: '아메리카노', amount: 4500, categoryId: coffee?.id ?? null, memo: null });
    const onSubmit = jest.fn();
    await render(
      <EntryFormModal visible categories={categories} onSubmit={onSubmit} onClose={jest.fn()} />,
    );
    await fireEvent.press(screen.getByText('☕ 아메리카노'));
    await fireEvent.press(screen.getByText('저장'));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: '아메리카노', amount: 4500, categoryId: coffee?.id }),
    );
  });

  it('기록이 없으면 모달에 칩 줄이 없다', async () => {
    await render(
      <EntryFormModal visible categories={getAllCategories()} onSubmit={jest.fn()} onClose={jest.fn()} />,
    );
    expect(screen.queryByText('최근 항목')).toBeNull();
  });

  it('수정 모드(initial 있음) 모달은 칩을 띄우지 않는다', async () => {
    const input = { date: today(), title: '아메리카노', amount: 4500, categoryId: null, memo: null };
    addEntry(input);
    await render(
      <EntryFormModal
        visible
        categories={getAllCategories()}
        initial={input}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.queryByText('최근 항목')).toBeNull();
  });
});
