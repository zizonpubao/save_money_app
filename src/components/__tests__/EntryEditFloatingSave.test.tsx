import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import EntryEditScreen from '@/app/entry/[id]';
import {
  addEntry,
  getAllCategories,
  getEntryById,
  initDatabase,
  resetDatabaseConnection,
} from '@/src/db';
import { useCategoryStore } from '@/src/store/categoryStore';
import { today } from '@/src/utils/date';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Soft: 'soft', Rigid: 'rigid', Medium: 'medium', Heavy: 'heavy' },
}));

const mockBack = jest.fn();
let mockId = '';
/** Stack.Screen 이 받은 options. 헤더 오른쪽에 저장이 남아 있지 않은지 본다 */
let mockScreenOptions: Record<string, unknown> | null = null;

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: mockId }),
  useRouter: () => ({ back: mockBack }),
  Stack: {
    Screen: ({ options }: { options: Record<string, unknown> }) => {
      mockScreenOptions = options;
      return null;
    },
  },
}));

const TITLE = '예: 아메리카노';

describe('기록 수정 화면의 떠 있는 저장 버튼', () => {
  beforeEach(() => {
    resetDatabaseConnection();
    initDatabase();
    useCategoryStore.setState({ categories: getAllCategories() });
    mockBack.mockClear();
    mockScreenOptions = null;
    jest.mocked(Haptics.selectionAsync).mockClear();
    const entry = addEntry({ date: today(), title: '아메리카노', amount: 4500, categoryId: null, memo: null });
    mockId = String(entry.id);
  });

  afterAll(() => {
    resetDatabaseConnection();
  });

  it('헤더에는 저장이 없고, 오른쪽 아래 저장 버튼과 삭제 버튼이 함께 있다', async () => {
    await render(<EntryEditScreen />);
    expect(mockScreenOptions).toEqual({ title: '기록 수정' });
    expect(mockScreenOptions).not.toHaveProperty('headerRight');
    expect(screen.getByTestId('floating-save')).toBeEnabled();
    expect(screen.getByText('이 기록 삭제')).toBeOnTheScreen();
  });

  it('떠 있는 버튼을 누르면 고친 값으로 저장하고 selection 햅틱 뒤 돌아간다', async () => {
    await render(<EntryEditScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText(TITLE), '라떼');
    await fireEvent.press(screen.getByTestId('floating-save'));
    expect(getEntryById(Number(mockId))).toEqual(expect.objectContaining({ title: '라떼', amount: 4500 }));
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('항목명을 지워 저장할 수 없으면 버튼이 비활성이고 눌러도 저장하지 않는다', async () => {
    await render(<EntryEditScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText(TITLE), '   ');
    const save = screen.getByTestId('floating-save');
    expect(save).toBeDisabled();
    await fireEvent.press(save);
    expect(getEntryById(Number(mockId))).toEqual(expect.objectContaining({ title: '아메리카노' }));
    expect(mockBack).not.toHaveBeenCalled();
  });
});
