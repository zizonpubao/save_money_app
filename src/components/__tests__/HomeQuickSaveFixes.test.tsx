import { act, fireEvent, render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/(tabs)/index';
import { addEntry, initDatabase, resetDatabaseConnection } from '@/src/db';
import { useCategoryStore } from '@/src/store/categoryStore';
import { useEntryStore } from '@/src/store/entryStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { motion } from '@/src/theme';
import { addDays, thisMonth, today } from '@/src/utils/date';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('@/src/components/EntryRow', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    EntryRow: ({ entry }: { entry: { title: string } }) => <Text>{entry.title}</Text>,
  };
});

/**
 * 탭을 떠나는 순간(blur)을 흉내 내려고 useFocusEffect 콜백을 모아 둔다.
 * 마운트 때 한 번 부르고(포커스), blurAll() 이 돌려받은 정리 함수를 부른다(다른 탭으로 이동)
 */
const focusCleanups: (() => void)[] = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useIsFocused: () => true,
  useFocusEffect: (callback: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').useEffect(() => {
      const cleanup = callback();
      if (cleanup) focusCleanups.push(cleanup);
      return cleanup;
    }, [callback]);
  },
}));

async function blurAll() {
  await act(async () => {
    focusCleanups.splice(0).forEach((cleanup) => cleanup());
  });
}

const originalAddDeferred = useEntryStore.getState().addDeferred;

function resetAll() {
  resetDatabaseConnection();
  initDatabase();
  focusCleanups.length = 0;
  useCategoryStore.setState({ categories: [], loaded: false });
  useEntryStore.setState({
    oldestMonth: thisMonth(),
    entries: [],
    hasMore: false,
    todayTotal: 0,
    monthTotal: 0,
    celebrateTick: 0,
    lastRecord: null,
    lastGoalReached: false,
    lastMilestone: null,
    loaded: false,
    addDeferred: originalAddDeferred,
  });
  useSettingsStore.setState({ monthlyGoal: null, soundEnabled: true, hapticsEnabled: true, loaded: false });
}

async function wait(ms: number) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

describe('홈 화면 — 원탭 저장 M4.5 보완', () => {
  beforeEach(() => {
    resetAll();
    addEntry({ date: addDays(today(), -1), title: '커피', amount: 4500, categoryId: 1, memo: null });
  });
  afterAll(() => {
    useEntryStore.setState({ addDeferred: originalAddDeferred });
    resetDatabaseConnection();
  });

  it('메뉴가 열린 채 화면을 떠나면(blur) 메뉴가 닫힌다', async () => {
    await render(<HomeScreen />);
    await fireEvent(screen.getByLabelText('기록 추가'), 'longPress');
    expect(screen.getByTestId('quick-save-menu')).toBeOnTheScreen();

    await blurAll();
    expect(screen.queryByTestId('quick-save-menu')).toBeNull();
    expect(screen.queryByTestId('quick-save-backdrop')).toBeNull();
  });

  it('앞 원탭 저장의 t0 전에 또 저장하면, 앞 저장을 먼저 반영(publish)하고 덮는다', async () => {
    const publishes: string[] = [];
    useEntryStore.setState({
      addDeferred: (input) => {
        const staged = originalAddDeferred(input);
        const n = publishes.length;
        return {
          entry: staged.entry,
          publish: () => {
            publishes.push(`publish#${n}`);
            staged.publish();
          },
        };
      },
    });
    await render(<HomeScreen />);

    await fireEvent(screen.getByLabelText('기록 추가'), 'longPress');
    await fireEvent.press(screen.getByLabelText('커피 4,500원 바로 저장'));
    // 첫 저장의 t0(quickMenuMs) 가 오기 전에 한 번 더
    await fireEvent(screen.getByLabelText('기록 추가'), 'longPress');
    await fireEvent.press(screen.getByLabelText('커피 4,500원 바로 저장'));
    // 두 번째 저장 전에 첫 저장이 이미 반영됐다
    expect(publishes).toEqual(['publish#0']);
    expect(useEntryStore.getState().celebrateTick).toBe(1);

    await wait(motion.quickMenuMs + 50);
    expect(publishes).toHaveLength(2);
    // 두 저장 모두 tick 을 올렸다 (덮어쓰면 1에서 멈춘다)
    expect(useEntryStore.getState().celebrateTick).toBe(2);
    expect(useEntryStore.getState().todayTotal).toBe(9000);
  });
});
