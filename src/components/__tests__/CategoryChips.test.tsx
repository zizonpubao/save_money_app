import { fireEvent, render, screen } from '@testing-library/react-native';

import { CategoryChips } from '@/src/components/CategoryChips';
import type { Category } from '@/src/db';

const 커피: Category = { id: 1, name: '커피', emoji: '☕', sortOrder: 0, isDefault: true };
const 택시: Category = { id: 2, name: '택시', emoji: '🚕', sortOrder: 1, isDefault: true };
const CATEGORIES = [커피, 택시];

describe('CategoryChips (카테고리 칩)', () => {
  it('카테고리마다 "이모지 이름" 칩을 하나씩 그린다', async () => {
    await render(<CategoryChips categories={CATEGORIES} selectedId={null} onSelect={jest.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByText('🚕 택시')).toBeOnTheScreen();
  });

  it('selectedId 와 같은 칩만 선택 상태다', async () => {
    await render(<CategoryChips categories={CATEGORIES} selectedId={2} onSelect={jest.fn()} />);
    expect(screen.getByRole('button', { name: '🚕 택시' })).toBeSelected();
    expect(screen.getByRole('button', { name: '☕ 커피' })).not.toBeSelected();
  });

  it('selectedId 가 null 이면 아무 칩도 선택 상태가 아니다', async () => {
    await render(<CategoryChips categories={CATEGORIES} selectedId={null} onSelect={jest.fn()} />);
    for (const chip of screen.getAllByRole('button')) {
      expect(chip).not.toBeSelected();
    }
  });

  it('칩을 탭하면 그 카테고리 객체로 onSelect 가 불린다', async () => {
    const onSelect = jest.fn();
    await render(<CategoryChips categories={CATEGORIES} selectedId={null} onSelect={onSelect} />);
    await fireEvent.press(screen.getByText('☕ 커피'));
    expect(onSelect).toHaveBeenCalledWith(커피);
  });
});
