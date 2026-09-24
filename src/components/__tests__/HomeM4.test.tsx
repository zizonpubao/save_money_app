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
import type * as AudioMock from '@/__mocks__/expo-audio';
import { SOUND_FILES } from '@/src/features/useCelebrationSound';
import { useSettingsStore } from '@/src/store/settingsStore';
import { motion } from '@/src/theme';
import { addDays, addMonths, monthRange, thisMonth, today } from '@/src/utils/date';
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

// jest 는 모든 에셋을 같은 값으로 바꾸므로, 어느 효과음을 재생했는지 가리려고 파일마다 다른 id 를 준다
jest.mock('../../../assets/sounds/tap.wav', () => 101);
jest.mock('../../../assets/sounds/ding.wav', () => 102);
jest.mock('../../../assets/sounds/tada.wav', () => 103);
jest.mock('../../../assets/sounds/fanfare.wav', () => 104);

const { mockPlayers } = jest.requireMock<typeof AudioMock>('expo-audio');

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
  useSettingsStore.setState({ monthlyGoal: null, soundEnabled: true, hapticsEnabled: true, loaded: false });
  setHapticsEnabled(true);
  jest.mocked(Haptics.impactAsync).mockClear();
  jest.mocked(Haptics.notificationAsync).mockClear();
  jest.mocked(Haptics.selectionAsync).mockClear();
  for (const p of mockPlayers) p.play.mockClear();
}

let sheetOnDismiss: (() => void) | null = null;

/** + 버튼 → 금액·항목 입력 → 저장 (실제 사용자 흐름 그대로) */
async function saveViaSheet(amount: string, title: string) {
  await fireEvent.press(screen.getByLabelText('기록 추가'));
  // jest 의 Modal 은 닫히면 트리에서 빠지므로, 떠 있을 때 onDismiss 를 잡아 두고 "다 내려감"을 흉내 낸다
  sheetOnDismiss = screen.getByTestId('entry-form-modal').props.onDismiss;
  await fireEvent.changeText(screen.getByPlaceholderText('0'), amount);
  await fireEvent.changeText(screen.getByPlaceholderText('예: 아메리카노'), title);
  await fireEvent.press(screen.getByText('저장'));
}

/** 실제 시간으로 ms 만큼 기다린다 (화면 렌더가 멈추지 않게 진짜 타이머) */
async function wait(ms: number) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

/** iOS: 입력 시트가 다 내려간 순간(onDismiss) = t0 */
async function sheetDismissed() {
  await act(async () => {
    sheetOnDismiss?.();
  });
}

/** t0 이후 목표 피날레(t0+480)까지 */
async function waitCelebration() {
  await wait(motion.goalSuccessAt + 100);
}

/** 지금까지 울린 햅틱을 순서대로 (impact 는 세기, Success 는 'success', selection 은 'selection') */
function hapticsFired(): string[] {
  const calls: { order: number; kind: string }[] = [];
  const collect = (mock: jest.Mock, kind: (args: unknown[]) => string) =>
    mock.mock.calls.forEach((args, i) =>
      calls.push({ order: mock.mock.invocationCallOrder[i] ?? 0, kind: kind(args) }),
    );
  collect(jest.mocked(Haptics.impactAsync), (args) => String(args[0]));
  collect(jest.mocked(Haptics.notificationAsync), () => 'success');
  collect(jest.mocked(Haptics.selectionAsync), () => 'selection');
  return calls.sort((a, b) => a.order - b.order).map((c) => c.kind);
}

/** 재생한 효과음 이름들 */
function soundsPlayed(): string[] {
  const names = Object.entries(SOUND_FILES);
  return mockPlayers.flatMap((p) =>
    p.play.mock.calls.map(() => names.find(([, id]) => id === p.source)?.[0] ?? '?'),
  );
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

describe('홈 화면 — 저장 축하 연출 (M4, DESIGN 저장 축하 연출)', () => {
  beforeEach(resetAll);
  afterAll(() => {
    resetDatabaseConnection();
    setHapticsEnabled(true);
  });

  it('저장 탭 순간엔 selection 햅틱만, 시트가 내려가기 전(t0 전)에는 목록·연출이 바뀌지 않는다', async () => {
    await render(<HomeScreen />);
    await saveViaSheet('4500', '커피');
    expect(hapticsFired()).toEqual(['selection']);
    expect(screen.queryByText('커피')).toBeNull();
    expect(screen.queryByTestId('celebration-layer')).toBeNull();
    expect(soundsPlayed()).toEqual([]);
  });

  it('9,999원(base): t0 에 글로우·라벨, 타격에 Medium 한 번 + tap, 컨페티 없음', async () => {
    await render(<HomeScreen />);
    await saveViaSheet('9999', '간식');
    await sheetDismissed();
    expect(screen.getByText('간식')).toBeOnTheScreen();
    expect(screen.getByTestId('floating-label')).toHaveTextContent(/^\+9,999원/);
    expect(screen.queryByTestId('confetti')).toBeNull();
    await waitCelebration();
    expect(hapticsFired()).toEqual(['selection', 'medium']);
    expect(soundsPlayed()).toEqual(['tap']);
  });

  it('10,000원(mid): Medium → Heavy + ding + 컨페티 24개', async () => {
    await render(<HomeScreen />);
    await saveViaSheet('10000', '택시');
    await sheetDismissed();
    expect(screen.getAllByTestId('confetti-piece')).toHaveLength(24);
    await waitCelebration();
    expect(hapticsFired()).toEqual(['selection', 'medium', 'heavy']);
    expect(soundsPlayed()).toEqual(['ding']);
  });

  it('50,000원(big): Heavy 3연타 + tada + 컨페티 48개 + 화면 플래시 + "🔥" 라벨', async () => {
    await render(<HomeScreen />);
    await saveViaSheet('50000', '운동화');
    await sheetDismissed();
    expect(screen.getAllByTestId('confetti-piece')).toHaveLength(48);
    expect(screen.getByTestId('screen-flash')).toBeOnTheScreen();
    expect(screen.getByTestId('floating-label')).toHaveTextContent('+50,000원 🔥');
    await waitCelebration();
    expect(hapticsFired()).toEqual(['selection', 'heavy', 'heavy', 'heavy']);
    expect(soundsPlayed()).toEqual(['tada']);
  });

  it('onDismiss 가 안 와도(Android) 400ms 안전 타이머로 t0 가 온다', async () => {
    await render(<HomeScreen />);
    await saveViaSheet('10000', '택시');
    expect(screen.queryByTestId('confetti')).toBeNull();
    await wait(motion.t0FallbackMs + 50);
    expect(screen.getAllByTestId('confetti-piece')).toHaveLength(24);
  });

  it('55,000원: 오버레이는 스크롤 목록 밖, FAB 다음 형제(FAB 위)이고 터치를 막지 않는다', async () => {
    await render(<HomeScreen />);
    await saveViaSheet('55000', '운동화');
    await sheetDismissed();
    const layer = screen.getByTestId('celebration-layer');
    expect(layer.props.pointerEvents).toBe('none');
    expect(within(layer).getAllByTestId('confetti-piece')).toHaveLength(48);
    expect(layer).toHaveStyle({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 });
    const inScroll = (el: typeof layer) => {
      for (let node = el.parent; node; node = node.parent) {
        if (node.type === 'RCTScrollView') return true;
      }
      return false;
    };
    expect(inScroll(screen.getByText('운동화'))).toBe(true);
    expect(inScroll(layer)).toBe(false);
    // Screen 의 자식 순서: 홈 영역 → FAB → 오버레이. 뒤에 오는 형제가 위에 그려진다
    const screenRoot = layer.parent;
    const kids = (screenRoot?.children ?? []).filter((c) => typeof c !== 'string');
    const fabAt = kids.indexOf(screen.getByLabelText('기록 추가'));
    expect(fabAt).toBeGreaterThanOrEqual(0);
    expect(kids.indexOf(layer)).toBeGreaterThan(fabAt);
  });

  it('목표 달성: 금액이 작아도 big 연출 + 목표 햅틱(Heavy 3연타 → Success) + fanfare 하나 + 배너 하나', async () => {
    setSetting(SETTING_KEYS.monthlyGoal, '3000');
    await render(<HomeScreen />);
    await saveViaSheet('4500', '커피');
    await sheetDismissed();
    expect(screen.getByText('이번 달 목표 달성 🎉')).toBeOnTheScreen();
    expect(screen.getAllByTestId('record-banner')).toHaveLength(1);
    expect(screen.getAllByTestId('confetti-piece')).toHaveLength(48);
    await waitCelebration();
    expect(hapticsFired()).toEqual(['selection', 'heavy', 'heavy', 'heavy', 'success']);
    expect(soundsPlayed()).toEqual(['fanfare']);
  });

  it('누적 10만원을 넘는 저장은 "누적 10만원 돌파 🎉" 배너 + tada (이정표는 최소 big)', async () => {
    addEntry(entry({ date: monthRange(addMonths(thisMonth(), -1)).start, amount: 95000 }));
    await render(<HomeScreen />);
    await saveViaSheet('5000', '커피');
    await sheetDismissed();
    expect(screen.getByText('누적 10만원 돌파 🎉')).toBeOnTheScreen();
    expect(getSetting(SETTING_KEYS.milestoneReached)).toBe('100000');
    expect(screen.getAllByTestId('confetti-piece')).toHaveLength(48);
    await waitCelebration();
    expect(soundsPlayed()).toEqual(['tada']);
  });

  it('설정에서 효과음·햅틱을 끄면 저장해도 소리·진동이 없다 (연출은 그대로)', async () => {
    useSettingsStore.getState().setSoundEnabled(false);
    useSettingsStore.getState().setHapticsEnabled(false);
    await render(<HomeScreen />);
    await saveViaSheet('50000', '운동화');
    await sheetDismissed();
    expect(screen.getAllByTestId('confetti-piece')).toHaveLength(48);
    await waitCelebration();
    expect(hapticsFired()).toEqual([]);
    expect(soundsPlayed()).toEqual([]);
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
