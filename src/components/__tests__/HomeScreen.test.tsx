import { fireEvent, render, screen, within } from '@testing-library/react-native';

import HomeScreen from '@/app/(tabs)/index';
import {
  addEntry,
  getSetting,
  initDatabase,
  resetDatabaseConnection,
  setSetting,
  SETTING_KEYS,
} from '@/src/db';
import { formatQuote, quoteOfDay } from '@/src/features/quotes';
import { useCategoryStore } from '@/src/store/categoryStore';
import { useEntryStore } from '@/src/store/entryStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { addDays, addMonths, monthRange, thisMonth, today } from '@/src/utils/date';

const mockPush = jest.fn();

// 스와이프 행은 reanimated 대역에서 worklet 경고를 내므로, 이 테스트에선 제목만 그리는 행으로 바꾼다.
jest.mock('@/src/components/EntryRow', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    EntryRow: ({ entry }: { entry: { title: string } }) => <Text>{entry.title}</Text>,
  };
});

/** 테스트마다 홈 스토어를 "아직 DB 를 안 읽은" 상태로 되돌린다 (첫 오픈 판정이 새지 않게) */
const EMPTY_HOME = {
  oldestMonth: thisMonth(),
  entries: [],
  hasMore: false,
  todayTotal: 0,
  monthTotal: 0,
  celebrateTick: 0,
  loaded: false,
  yesterdayTotal: 0,
  dailyTotals: [],
  monthEmojis: [],
  firstOpenTick: 0,
};

// 네비게이터 밖에서 화면을 그리기 위해 라우터 훅을 대역으로 바꾼다.
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useIsFocused: () => true,
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
    useEntryStore.setState(EMPTY_HOME);
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
    useEntryStore.setState(EMPTY_HOME);
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
    expect(screen.getByText('목표 300,000원')).toBeOnTheScreen();
    expect(screen.getByText('0%')).toBeOnTheScreen();
  });
});

describe('홈 화면 — 활기 (M3.6)', () => {
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

  it('첫 설치(키 없음)로 홈을 열면 첫 오픈: 오늘 날짜를 적고 큰 숫자가 0원에서 카운트업을 시작한다', async () => {
    addEntry({ date: today(), title: '아메리카노', amount: 4500, categoryId: 1, memo: null });
    await render(<HomeScreen />);
    expect(getSetting(SETTING_KEYS.lastOpenDate)).toBe(today());
    expect(useEntryStore.getState().firstOpenTick).toBe(1);
    // jest 에서는 카운트업이 진행되지 않아 큰 숫자의 시작값 0원이 그대로 보인다 (오늘 행·목록은 4,500원)
    expect(screen.getByText('0원')).toBeOnTheScreen();
  });

  it('같은 날 다시 열면 카운트업 없이 월 합계를 바로 보여준다', async () => {
    setSetting(SETTING_KEYS.lastOpenDate, today());
    addEntry({ date: today(), title: '치킨', amount: 20000, categoryId: null, memo: null });
    await render(<HomeScreen />);
    expect(useEntryStore.getState().firstOpenTick).toBe(0);
    // 큰 숫자도 0원을 거치지 않고 20,000원 (카드 큰 숫자·섹션 합계, 오늘 줄은 문장 안에)
    expect(screen.queryByText('0원')).toBeNull();
    expect(screen.getAllByText('20,000원')).toHaveLength(2);
    expect(screen.getByText(/^오늘 20,000원 · /)).toBeOnTheScreen();
  });

  it('홈에 오늘의 한 줄(카드 안)·이모지 적립 칩·잔디 구획(카드 밖)이 함께 그려진다', async () => {
    addEntry({ date: today(), title: '아메리카노', amount: 4500, categoryId: 1, memo: null });
    await render(<HomeScreen />);
    expect(screen.getByTestId('daily-line')).toBeOnTheScreen();
    expect(screen.getByTestId('emoji-strip')).toBeOnTheScreen();
    expect(screen.getByTestId('month-grass')).toBeOnTheScreen();
    expect(within(screen.getByTestId('emoji-strip')).getByText('☕')).toBeOnTheScreen();
  });

  it('오늘 기록이 없고 목표도 없으면 한 줄은 오늘의 명언이다', async () => {
    addEntry({ date: addDays(today(), -1), title: '택시', amount: 9000, categoryId: null, memo: null });
    await render(<HomeScreen />);
    expect(screen.getByTestId('daily-line')).toHaveTextContent(formatQuote(quoteOfDay(today())));
  });
});
