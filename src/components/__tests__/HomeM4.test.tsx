import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import HomeScreen from '@/app/(tabs)/index';
import {
  addEntry,
  getSetting,
  initDatabase,
  resetDatabaseConnection,
  setSetting,
  SETTING_KEYS,
  type EntryInput,
} from '@/src/db';
import { useCategoryStore } from '@/src/store/categoryStore';
import { useEntryStore } from '@/src/store/entryStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { addDays, addMonths, monthRange, thisMonth, today } from '@/src/utils/date';

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

/** Date 만 고정한다 (setTimeout 등은 진짜 타이머 그대로 — 화면 렌더가 멈추지 않게) */
function freezeDate(date: Date) {
  jest.useFakeTimers({
    now: date,
    doNotFake: [
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  });
}

function entry(over: Partial<EntryInput> = {}): EntryInput {
  return { date: today(), title: '아메리카노', amount: 4500, categoryId: 1, memo: null, ...over };
}

function resetAll() {
  resetDatabaseConnection();
  initDatabase();
  useCategoryStore.setState({ categories: [], loaded: false });
  useEntryStore.setState(EMPTY_HOME);
  useSettingsStore.setState({ monthlyGoal: null, loaded: false });
  jest.mocked(Haptics.impactAsync).mockClear();
  jest.mocked(Haptics.notificationAsync).mockClear();
}

/** + 버튼 → 금액·항목 입력 → 저장 (실제 사용자 흐름 그대로) */
async function saveViaSheet(amount: string, title: string) {
  await fireEvent.press(screen.getByLabelText('기록 추가'));
  await fireEvent.changeText(screen.getByPlaceholderText('0'), amount);
  await fireEvent.changeText(screen.getByPlaceholderText('예: 아메리카노'), title);
  await fireEvent.press(screen.getByText('저장'));
}

/** 두 번째 진동(120·150ms 뒤)까지 기다린다 */
async function waitHaptics() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });
}

describe('홈 화면 — 칩 행 (M4 연속 기록일 · 누적)', () => {
  beforeEach(resetAll);
  afterAll(() => resetDatabaseConnection());

  it('어제·오늘 기록이 있으면 "🔥 2일째" · "누적 …원" 칩이 이모지 칩 앞에 나온다', async () => {
    addEntry(entry({ date: addDays(today(), -1), amount: 9000 }));
    addEntry(entry({ amount: 4500 }));
    await render(<HomeScreen />);
    expect(screen.getByTestId('streak-chip')).toHaveTextContent('🔥 2일째');
    expect(screen.getByTestId('total-chip')).toHaveTextContent('누적 13,500원');
  });

  it('기록이 하나도 없으면 칩 행이 없다 (🔥 0일 같은 칩을 띄우지 않는다)', async () => {
    await render(<HomeScreen />);
    expect(screen.queryByTestId('streak-chip')).toBeNull();
    expect(screen.queryByTestId('total-chip')).toBeNull();
    expect(screen.queryByText(/🔥/)).toBeNull();
  });

  it('이번 달 이모지가 없어도 누적 칩은 보이고, 연속이 끊겼으면 🔥 칩만 숨긴다', async () => {
    addEntry(entry({ date: monthRange(addMonths(thisMonth(), -2)).start, amount: 30000 }));
    await render(<HomeScreen />);
    expect(screen.getByTestId('total-chip')).toHaveTextContent('누적 30,000원');
    expect(screen.queryByTestId('streak-chip')).toBeNull();
    expect(screen.queryByTestId('emoji-strip')).toBeNull();
  });
});

describe('홈 화면 — 금액 구간 이펙트 (M4)', () => {
  beforeEach(resetAll);
  afterAll(() => resetDatabaseConnection());

  it('9,999원 저장: Success 햅틱만, 컨페티 없음', async () => {
    await render(<HomeScreen />);
    await saveViaSheet('9999', '간식');
    await waitHaptics();
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(screen.queryByTestId('confetti')).toBeNull();
  });

  it('10,000원 저장: Medium 2연타 + 컨페티 20개', async () => {
    await render(<HomeScreen />);
    await saveViaSheet('10000', '택시');
    expect(screen.getAllByTestId('confetti-piece')).toHaveLength(20);
    await waitHaptics();
    expect(jest.mocked(Haptics.impactAsync).mock.calls).toEqual([['medium'], ['medium']]);
  });

  it('50,000원 저장: Heavy 한 번 + 컨페티 40개', async () => {
    await render(<HomeScreen />);
    await saveViaSheet('50000', '운동화');
    expect(screen.getAllByTestId('confetti-piece')).toHaveLength(40);
    await waitHaptics();
    expect(jest.mocked(Haptics.impactAsync).mock.calls).toEqual([['heavy']]);
  });

  it('55,000원 저장: 컨페티 40개가 스크롤 목록 밖 화면 전체 오버레이에 그려진다 (목록 경계에 잘리지 않게)', async () => {
    await render(<HomeScreen />);
    expect(screen.queryByTestId('confetti')).toBeNull();
    await saveViaSheet('55000', '운동화');
    const overlay = screen.getByTestId('confetti');
    expect(within(overlay).getAllByTestId('confetti-piece')).toHaveLength(40);
    expect(overlay).toHaveStyle({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 });
    // 목록 행은 스크롤 뷰 안에 있고, 컨페티 오버레이는 그 밖에 있다
    const inScroll = (el: typeof overlay) => {
      for (let node = el.parent; node; node = node.parent) {
        if (node.type === 'RCTScrollView') return true;
      }
      return false;
    };
    expect(inScroll(screen.getByText('운동화'))).toBe(true);
    expect(inScroll(overlay)).toBe(false);
  });

  it('목표 달성과 겹치면 햅틱은 목표 것(Heavy 2연타)만, 컨페티는 그대로', async () => {
    setSetting(SETTING_KEYS.monthlyGoal, '30000');
    await render(<HomeScreen />);
    await saveViaSheet('50000', '운동화');
    expect(screen.getByText('이번 달 목표 달성 🎉')).toBeOnTheScreen();
    expect(screen.getAllByTestId('confetti-piece')).toHaveLength(40);
    await waitHaptics();
    expect(jest.mocked(Haptics.impactAsync).mock.calls).toEqual([['heavy'], ['heavy']]);
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it('누적 10만원을 넘는 저장은 "누적 10만원 돌파 🎉" 배너', async () => {
    addEntry(entry({ date: monthRange(addMonths(thisMonth(), -1)).start, amount: 95000 }));
    await render(<HomeScreen />);
    await saveViaSheet('5000', '커피');
    expect(screen.getByText('누적 10만원 돌파 🎉')).toBeOnTheScreen();
    expect(getSetting(SETTING_KEYS.milestoneReached)).toBe('100000');
  });
});

describe('홈 화면 — 지난달 회고 카드 (M4)', () => {
  beforeEach(resetAll);
  afterEach(() => jest.useRealTimers());
  afterAll(() => resetDatabaseConnection());

  it('다음 달 2일에 열면 맨 위에 회고 한 줄, 닫으면 사라지고 지난달을 닫은 달로 적는다', async () => {
    freezeDate(new Date(2026, 9, 2, 12, 0, 0));
    addEntry(entry({ date: '2026-09-03', amount: 4500, categoryId: 1 }));
    addEntry(entry({ date: '2026-09-20', amount: 4500, categoryId: 1 }));
    addEntry(entry({ date: '2026-09-21', title: '택시', amount: 6000, categoryId: 4 }));
    useEntryStore.setState({ oldestMonth: '2026-10' });
    await render(<HomeScreen />);
    expect(screen.getByTestId('review-card')).toBeOnTheScreen();
    expect(screen.getByText('9월엔 3번 참아 15,000원 · 최다 ☕ 커피')).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText('지난달 회고 닫기'));
    expect(screen.queryByTestId('review-card')).toBeNull();
    expect(getSetting(SETTING_KEYS.reviewDismissedMonth)).toBe('2026-09');
  });

  it('4일에는 띄우지 않는다', async () => {
    freezeDate(new Date(2026, 9, 4, 12, 0, 0));
    addEntry(entry({ date: '2026-09-03' }));
    useEntryStore.setState({ oldestMonth: '2026-10' });
    await render(<HomeScreen />);
    expect(screen.queryByTestId('review-card')).toBeNull();
  });

  it('이미 닫은 달이면 다시 띄우지 않는다', async () => {
    freezeDate(new Date(2026, 9, 1, 9, 0, 0));
    addEntry(entry({ date: '2026-09-03' }));
    setSetting(SETTING_KEYS.reviewDismissedMonth, '2026-09');
    useEntryStore.setState({ oldestMonth: '2026-10' });
    await render(<HomeScreen />);
    expect(screen.queryByTestId('review-card')).toBeNull();
  });
});
