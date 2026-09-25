import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import HomeScreen from '@/app/(tabs)/index';
import { addEntry, initDatabase, resetDatabaseConnection, type EntryInput } from '@/src/db';
import { useCategoryStore } from '@/src/store/categoryStore';
import { useEntryStore } from '@/src/store/entryStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { motion } from '@/src/theme';
import { addDays, thisMonth, today } from '@/src/utils/date';
import { setHapticsEnabled } from '@/src/utils/haptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
}));

// 스와이프 행은 reanimated 대역에서 worklet 경고를 내므로 제목만 그리는 행으로 바꾼다.
jest.mock('@/src/components/EntryRow', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    EntryRow: ({ entry }: { entry: { title: string } }) => <Text>{entry.title}</Text>,
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
  lastRecord: null,
  goalReachedTick: 0,
  lastGoalReached: false,
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

const originalAddDeferred = useEntryStore.getState().addDeferred;

function resetAll() {
  resetDatabaseConnection();
  initDatabase();
  useCategoryStore.setState({ categories: [], loaded: false });
  useEntryStore.setState({ ...EMPTY_HOME, addDeferred: originalAddDeferred });
  useSettingsStore.setState({ monthlyGoal: null, soundEnabled: true, hapticsEnabled: true, loaded: false });
  setHapticsEnabled(true);
  jest.mocked(Haptics.impactAsync).mockClear();
  jest.mocked(Haptics.selectionAsync).mockClear();
}

/** 어제 날짜로 넣는다 (원탭 저장이 "오늘" 로 들어가는지 가리려고) */
function seed(over: Partial<EntryInput>) {
  addEntry({
    date: addDays(today(), -1),
    title: '아메리카노',
    amount: 4500,
    categoryId: 1,
    memo: '어제 메모',
    ...over,
  });
}

async function wait(ms: number) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

async function longPressFab() {
  await fireEvent(screen.getByLabelText('기록 추가'), 'longPress');
}

describe('홈 화면 — + 길게 누르기 원탭 저장 (M4.5)', () => {
  beforeEach(resetAll);
  afterAll(() => {
    useEntryStore.setState({ addDeferred: originalAddDeferred });
    resetDatabaseConnection();
  });

  it('길게 누르면 Medium 햅틱 + FAB 위 메뉴에 최근 항목 4개(이모지·항목명·금액)', async () => {
    for (const [i, title] of ['가', '나', '다', '라', '마', '커피'].entries()) {
      seed({ title, amount: 1000 * (i + 1) });
    }
    await render(<HomeScreen />);
    expect(screen.queryByTestId('quick-save-menu')).toBeNull();
    await longPressFab();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
    expect(screen.getByTestId('quick-save-menu')).toBeOnTheScreen();
    expect(screen.getAllByTestId('quick-save-row')).toHaveLength(4);
    // 최근 순: 마지막에 넣은 "커피" 가 맨 위
    expect(screen.getByLabelText('커피 6,000원 바로 저장')).toBeOnTheScreen();
    expect(screen.queryByLabelText(/^가 /)).toBeNull();
    // 모달은 열리지 않는다 (jest 의 Modal 은 닫혀 있으면 트리에 없다)
    expect(screen.queryByTestId('entry-form-modal')).toBeNull();
  });

  it('항목을 누르면 모달 없이 오늘 날짜·같은 금액·카테고리·메모 없음으로 저장하고, 메뉴가 닫힌 뒤(t0) 반영된다', async () => {
    seed({ title: '택시', amount: 12000, categoryId: 4 });
    const addDeferred = jest.fn(originalAddDeferred);
    useEntryStore.setState({ addDeferred });
    await render(<HomeScreen />);
    await longPressFab();
    await fireEvent.press(screen.getByLabelText('택시 12,000원 바로 저장'));

    expect(addDeferred).toHaveBeenCalledTimes(1);
    expect(addDeferred).toHaveBeenCalledWith({
      date: today(),
      title: '택시',
      amount: 12000,
      categoryId: 4,
      memo: null,
    });
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('quick-save-menu')).toBeNull();
    expect(screen.queryByTestId('entry-form-modal')).toBeNull();
    // t0 전: 화면 반영·연출 없음
    expect(useEntryStore.getState().celebrateTick).toBe(0);
    expect(screen.queryByTestId('celebration-layer')).toBeNull();

    await wait(motion.quickMenuMs + 50);
    expect(useEntryStore.getState().celebrateTick).toBe(1);
    expect(useEntryStore.getState().todayTotal).toBe(12000);
    expect(screen.getByTestId('celebration-layer')).toBeOnTheScreen();
    expect(screen.getByTestId('floating-label')).toHaveTextContent(/^\+12,000원/);
  });

  it('최근 항목이 없으면 길게 눌러도 평소처럼 입력 모달이 열린다', async () => {
    await render(<HomeScreen />);
    await longPressFab();
    expect(screen.queryByTestId('quick-save-menu')).toBeNull();
    expect(screen.getByTestId('entry-form-modal').props.visible).toBe(true);
  });

  it('메뉴 밖을 누르면(쓸기 시작 포함) 저장 없이 닫힌다', async () => {
    seed({ title: '커피' });
    const addDeferred = jest.fn(originalAddDeferred);
    useEntryStore.setState({ addDeferred });
    await render(<HomeScreen />);
    await longPressFab();
    expect(screen.getByTestId('quick-save-menu')).toBeOnTheScreen();
    await fireEvent(screen.getByTestId('quick-save-backdrop'), 'pressIn');
    expect(screen.queryByTestId('quick-save-menu')).toBeNull();
    expect(screen.queryByTestId('quick-save-backdrop')).toBeNull();
    expect(addDeferred).not.toHaveBeenCalled();
  });

  it('짧은 탭은 그대로 입력 모달을 연다', async () => {
    seed({ title: '커피' });
    await render(<HomeScreen />);
    await fireEvent.press(screen.getByLabelText('기록 추가'));
    expect(screen.queryByTestId('quick-save-menu')).toBeNull();
    expect(screen.getByTestId('entry-form-modal').props.visible).toBe(true);
  });
});
