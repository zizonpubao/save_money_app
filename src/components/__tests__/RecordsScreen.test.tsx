import { fireEvent, render, screen } from '@testing-library/react-native';

import RecordsScreen from '@/app/(tabs)/monthly';
import { addEntry, initDatabase, resetDatabaseConnection } from '@/src/db';
import { useCategoryStore } from '@/src/store/categoryStore';
import { formatKoMonth, formatKoYear, thisMonth, thisYear, today } from '@/src/utils/date';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').useEffect(callback, [callback]);
  },
}));

// 스와이프 행은 reanimated 대역에서 worklet 경고를 내므로, 이 테스트에선 제목만 그리는 행으로 바꾼다.
jest.mock('@/src/components/EntryRow', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    EntryRow: ({ entry }: { entry: { title: string } }) => <Text>{entry.title}</Text>,
  };
});

describe('기록 탭 화면 (월 / 년 토글)', () => {
  beforeEach(() => {
    resetDatabaseConnection();
    initDatabase();
    useCategoryStore.setState({ categories: [], loaded: false });
  });

  afterAll(() => {
    resetDatabaseConnection();
  });

  it('년을 누르면 "2026년" 이동·월별 막대 12칸·월별 섹션 헤더로 바뀐다', async () => {
    addEntry({ date: today(), title: '아메리카노', amount: 4500, categoryId: null, memo: null });
    await render(<RecordsScreen />);
    expect(screen.getByText(formatKoMonth(thisMonth()))).toBeOnTheScreen();
    expect(screen.getByText('일별')).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('년'));
    expect(screen.getByText(formatKoYear(thisYear()))).toBeOnTheScreen();
    expect(screen.getByText('월별')).toBeOnTheScreen();
    expect(screen.getByText(/월 평균/)).toBeOnTheScreen();
    expect(screen.getAllByLabelText(/^\d+월 /)).toHaveLength(12);
    // 목록 섹션 헤더는 "2026년 9월" (월별 섹션)
    expect(screen.getAllByText(formatKoMonth(thisMonth())).length).toBeGreaterThan(0);
    expect(screen.getByText('아메리카노')).toBeOnTheScreen();
  });

  it('기록이 없는 해는 빈 상태 문구를 보여준다', async () => {
    await render(<RecordsScreen />);
    await fireEvent.press(screen.getByText('년'));
    expect(screen.getByText('이 해엔 기록이 없어요')).toBeOnTheScreen();
  });
});
