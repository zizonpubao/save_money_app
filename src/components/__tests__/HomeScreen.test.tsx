import { fireEvent, render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/(tabs)/index';
import {
  addEntry,
  initDatabase,
  resetDatabaseConnection,
  setSetting,
  SETTING_KEYS,
} from '@/src/db';
import { useCategoryStore } from '@/src/store/categoryStore';
import { useEntryStore } from '@/src/store/entryStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { addMonths, monthRange, thisMonth } from '@/src/utils/date';

const mockPush = jest.fn();

// 네비게이터 밖에서 화면을 그리기 위해 라우터 훅을 대역으로 바꾼다.
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
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
    useSettingsStore.setState({ monthlyGoal: null, loaded: false });
    mockPush.mockClear();
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

describe('홈 화면 — 월 목표 (M3.5)', () => {
  beforeEach(() => {
    resetDatabaseConnection();
    initDatabase();
    useCategoryStore.setState({ categories: [], loaded: false });
    useEntryStore.setState({ oldestMonth: thisMonth(), entries: [], hasMore: false });
    useSettingsStore.setState({ monthlyGoal: null, loaded: false });
    mockPush.mockClear();
  });

  afterAll(() => {
    resetDatabaseConnection();
  });

  it('목표가 없으면 안내 문구가 보이고, 탭하면 설정 탭으로 간다', async () => {
    await render(<HomeScreen />);
    await fireEvent.press(screen.getByText('목표를 정하면 진행률이 보여요 →'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings');
  });

  it('DB 에 목표가 있으면 홈을 열 때 읽어서 진행률을 보여준다', async () => {
    setSetting(SETTING_KEYS.monthlyGoal, '300000');
    await render(<HomeScreen />);
    expect(screen.getByText('목표 300,000원 · 0%')).toBeOnTheScreen();
  });
});
