import { render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/(tabs)/index';
import { addEntry, initDatabase, resetDatabaseConnection } from '@/src/db';
import { useCategoryStore } from '@/src/store/categoryStore';
import { useEntryStore } from '@/src/store/entryStore';
import { addMonths, monthRange, thisMonth } from '@/src/utils/date';

// 네비게이터 밖에서 화면을 그리기 위해 라우터 훅을 대역으로 바꾼다.
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').useEffect(callback, [callback]);
  },
}));

describe('홈 화면 (탭 재구성 후)', () => {
  beforeEach(() => {
    resetDatabaseConnection();
    initDatabase();
    useCategoryStore.setState({ categories: [], loaded: false });
    useEntryStore.setState({ oldestMonth: thisMonth(), entries: [], hasMore: false });
  });

  afterAll(() => {
    resetDatabaseConnection();
  });

  it('월 / 년 토글이 없다 (기록 탭으로 옮김)', async () => {
    await render(<HomeScreen />);
    expect(screen.getByText('이번 달 기록이 없어요')).toBeOnTheScreen();
    expect(screen.queryByText('년')).toBeNull();
    expect(screen.queryByText('월')).toBeNull();
  });

  it('지난달 기록이 있으면 "이전 달 더 보기" 는 그대로 있다', async () => {
    addEntry({
      date: monthRange(addMonths(thisMonth(), -1)).start,
      title: '아메리카노',
      amount: 4500,
      categoryId: null,
      memo: null,
    });
    await render(<HomeScreen />);
    expect(screen.getByText('이전 달 더 보기')).toBeOnTheScreen();
  });
});
