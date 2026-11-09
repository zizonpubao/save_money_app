import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as StoreReview from 'expo-store-review';

import HomeScreen from '@/app/(tabs)/index';
import {
  addEntry,
  getSetting,
  initDatabase,
  resetDatabaseConnection,
  setSetting,
  SETTING_KEYS,
} from '@/src/db';
import { useCategoryStore } from '@/src/store/categoryStore';
import { useEntryStore } from '@/src/store/entryStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { motion } from '@/src/theme';
import { today } from '@/src/utils/date';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Rigid: 'rigid', Soft: 'soft' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('@/src/components/EntryRow', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return { EntryRow: ({ entry }: { entry: { title: string } }) => <Text>{entry.title}</Text> };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useIsFocused: () => true,
  useFocusEffect: (callback: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').useEffect(callback, [callback]);
  },
}));

const requestReview = jest.mocked(StoreReview.requestReview);

/** 이미 있는 기록 count 건. 합계는 이정표(10만) 아래다 */
function seed(count: number) {
  for (let i = 0; i < count; i += 1) {
    addEntry({ date: today(), title: `기록${i}`, amount: 1000, categoryId: null, memo: null });
  }
}

let onDismiss: (() => void) | null = null;

async function save(amount: string, title: string) {
  await fireEvent.press(screen.getByLabelText('기록 추가'));
  onDismiss = screen.getByTestId('entry-form-modal').props.onDismiss;
  await fireEvent.changeText(screen.getByPlaceholderText('0'), amount);
  await fireEvent.changeText(screen.getByPlaceholderText('예: 아메리카노'), title);
  await fireEvent.press(screen.getByTestId('floating-save'));
  await act(async () => {
    onDismiss?.();
  });
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
  // 별점 요청은 await 가 이어진다 (isAvailableAsync → hasAction → requestReview)
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('홈 — 별점 요청 시점', () => {
  beforeEach(() => {
    resetDatabaseConnection();
    initDatabase();
    useCategoryStore.setState({ categories: [], loaded: false });
    useSettingsStore.setState({ monthlyGoal: null, loaded: false });
    useEntryStore.setState({ lastGoalReached: false, lastMilestone: null, lastRecord: null });
    jest.mocked(StoreReview.isAvailableAsync).mockResolvedValue(true);
    jest.mocked(StoreReview.hasAction).mockResolvedValue(true);
    requestReview.mockClear();
    jest.useFakeTimers({
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
      ],
    });
  });

  afterEach(() => jest.useRealTimers());
  afterAll(() => resetDatabaseConnection());

  it('이정표를 넘긴 저장 뒤 연출이 끝나야(2.5초) 요청한다', async () => {
    seed(5);
    await render(<HomeScreen />);
    await save('100000', '큰 절약');
    await advance(motion.reviewPromptMs - 100);
    expect(requestReview).not.toHaveBeenCalled();
    await advance(100);
    expect(requestReview).toHaveBeenCalledTimes(1);
    expect(getSetting(SETTING_KEYS.reviewRequestedAt)).toBe(today());
  });

  it('연출이 끝나는 시각보다 뒤에 띄운다', () => {
    expect(motion.reviewPromptMs).toBeGreaterThan(motion.layerMs);
    expect(motion.reviewPromptMs).toBeGreaterThan(motion.bannerAt + 1500);
  });

  it('월 목표를 처음 달성한 저장이면 요청한다', async () => {
    seed(5);
    setSetting(SETTING_KEYS.monthlyGoal, '8000');
    await render(<HomeScreen />);
    await save('4500', '커피');
    await advance(motion.reviewPromptMs);
    expect(requestReview).toHaveBeenCalledTimes(1);
  });

  it('사건 없는 저장은 요청하지 않는다', async () => {
    seed(5);
    await render(<HomeScreen />);
    await save('4500', '커피');
    await advance(motion.reviewPromptMs * 2);
    expect(requestReview).not.toHaveBeenCalled();
  });

  it('바로 이어 저장해도 요청이 사라지지 않고 마지막 연출 뒤로 밀린다', async () => {
    seed(5);
    await render(<HomeScreen />);
    await save('100000', '큰 절약');
    await advance(1000);
    await save('4500', '커피');
    await advance(motion.reviewPromptMs - 100);
    expect(requestReview).not.toHaveBeenCalled();
    await advance(100);
    expect(requestReview).toHaveBeenCalledTimes(1);
  });

  it('입력 시트가 열려 있으면 닫힐 때까지 미룬다', async () => {
    seed(5);
    await render(<HomeScreen />);
    await save('100000', '큰 절약');
    await advance(1000);
    await fireEvent.press(screen.getByLabelText('기록 추가'));
    await advance(motion.reviewPromptMs * 2);
    expect(requestReview).not.toHaveBeenCalled();
    await act(async () => {
      screen.getByTestId('entry-form-modal').props.onRequestClose();
    });
    await advance(motion.reviewPromptMs);
    expect(requestReview).toHaveBeenCalledTimes(1);
  });
});
