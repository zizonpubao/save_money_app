import { render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/(tabs)/index';
import RecordsScreen from '@/app/(tabs)/monthly';
import {
  addCategory,
  addEntry,
  deleteCategory,
  initDatabase,
  resetDatabaseConnection,
  UNCATEGORIZED_EMOJI,
} from '@/src/db';
import { entryEmoji, toCategoryMap, useCategoryStore } from '@/src/store/categoryStore';
import { useEntryStore } from '@/src/store/entryStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { thisMonth, today } from '@/src/utils/date';

// 스와이프 행 대신 "이모지 항목명" 한 줄만 그려 행이 받은 이모지를 확인한다
jest.mock('@/src/components/EntryRow', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    EntryRow: ({ entry, emoji }: { entry: { title: string }; emoji: string }) => (
      <Text>{`${emoji} ${entry.title}`}</Text>
    ),
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useIsFocused: () => true,
  useFocusEffect: (callback: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').useEffect(callback, [callback]);
  },
}));

const EMPTY_HOME = {
  oldestMonth: thisMonth(),
  entries: [],
  hasMore: false,
  todayTotal: 0,
  monthTotal: 0,
  celebrateTick: 0,
  celebrateTier: 'base' as const,
  celebratedAt: 0,
  lastMilestone: null,
  loaded: false,
  yesterdayTotal: 0,
  dailyTotals: [],
  monthEmojis: [],
  firstOpenTick: 0,
  streak: 0,
  totalSum: 0,
  review: { month: '', count: 0, total: 0, topCategoryId: null },
  reviewDismissedMonth: null,
};

/** 카테고리 없는 기록 하나 + 카테고리를 지워 미분류가 된 기록 하나 */
function seedUncategorized() {
  addEntry({ date: today(), title: '편의점', amount: 3000, categoryId: null, memo: null });
  const temp = addCategory({ name: '임시', emoji: '🧪' });
  addEntry({ date: today(), title: '붕어빵', amount: 2000, categoryId: temp.id, memo: null });
  deleteCategory(temp.id);
}

describe('미분류 이모지는 어디서나 📦', () => {
  beforeEach(() => {
    resetDatabaseConnection();
    initDatabase();
    useCategoryStore.setState({ categories: [], loaded: false });
    useEntryStore.setState(EMPTY_HOME);
    useSettingsStore.setState({ monthlyGoal: null, loaded: false });
  });

  afterAll(() => {
    resetDatabaseConnection();
  });

  it('entryEmoji: 카테고리 없음(NULL)·지워진 id 는 📦, 있으면 그 이모지', () => {
    const map = toCategoryMap([{ id: 1, name: '커피', emoji: '☕', sortOrder: 0, isDefault: true }]);
    expect(UNCATEGORIZED_EMOJI).toBe('📦');
    expect(entryEmoji(1, map)).toBe('☕');
    expect(entryEmoji(null, map)).toBe('📦');
    expect(entryEmoji(99, map)).toBe('📦');
  });

  it('홈 목록 행: 카테고리 없는 기록과 카테고리를 지운 기록 모두 📦 (💰 아님)', async () => {
    seedUncategorized();
    await render(<HomeScreen />);
    expect(screen.getByText('📦 편의점')).toBeOnTheScreen();
    expect(screen.getByText('📦 붕어빵')).toBeOnTheScreen();
    expect(screen.queryByText(/💰/)).toBeNull();
  });

  it('기록 탭 목록 행과 카테고리 합계: 📦 · "미분류"', async () => {
    seedUncategorized();
    await render(<RecordsScreen />);
    expect(screen.getByText('📦 편의점')).toBeOnTheScreen();
    expect(screen.getByText('📦 붕어빵')).toBeOnTheScreen();
    expect(screen.getByText('미분류')).toBeOnTheScreen();
    expect(screen.queryByText(/💰/)).toBeNull();
  });
});
