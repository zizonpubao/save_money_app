import * as Haptics from 'expo-haptics';

import {
  HAPTIC_PATTERNS,
  isHapticsEnabled,
  playCelebrationHaptic,
  saveTapHaptic,
  scrubTick,
  setHapticsEnabled,
} from '@/src/utils/haptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
}));

/** 지금까지 울린 햅틱을 순서대로 (impact 는 세기, notification 은 'success', selection 은 'selection') */
function fired(): string[] {
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

describe('축하 햅틱 패턴 (M4)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    setHapticsEnabled(true);
  });
  afterEach(() => jest.useRealTimers());

  it('박자표: base Medium · mid Medium→Heavy 80 · big Heavy 0/90/220 + Success 420(t0+500) · goal 은 big 과 같다', () => {
    const beats = (p: keyof typeof HAPTIC_PATTERNS) => HAPTIC_PATTERNS[p].map((s) => [s.at, s.kind]);
    expect(beats('base')).toEqual([[0, 'medium']]);
    expect(beats('mid')).toEqual([
      [0, 'medium'],
      [80, 'heavy'],
    ]);
    expect(beats('big')).toEqual([
      [0, 'heavy'],
      [90, 'heavy'],
      [220, 'heavy'],
      [420, 'success'],
    ]);
    // Success 가 두 번 울리지 않게 목표는 big 과 같은 박자 (목표는 소리·배너·틴트로 구분)
    expect(beats('goal')).toEqual(beats('big'));
  });

  it('mid: 바로 Medium, 80ms 뒤 Heavy', () => {
    playCelebrationHaptic('mid');
    expect(fired()).toEqual(['medium']);
    jest.advanceTimersByTime(80);
    expect(fired()).toEqual(['medium', 'heavy']);
  });

  it('big: Heavy 3연타(0/90/220) 뒤 420 에 Success — 4번, Success 는 impact 와 같은 박자에 겹치지 않는다', () => {
    playCelebrationHaptic('big');
    jest.advanceTimersByTime(220);
    expect(fired()).toEqual(['heavy', 'heavy', 'heavy']);
    jest.advanceTimersByTime(199);
    expect(fired()).toEqual(['heavy', 'heavy', 'heavy']);
    jest.advanceTimersByTime(1);
    expect(fired()).toEqual(['heavy', 'heavy', 'heavy', 'success']);
    const successAt = HAPTIC_PATTERNS.big.find((s) => s.kind === 'success')?.at;
    expect(HAPTIC_PATTERNS.big.filter((s) => s.at === successAt)).toHaveLength(1);
  });

  it('goal: big 과 같은 4박, Success 는 한 번뿐', () => {
    playCelebrationHaptic('goal');
    jest.advanceTimersByTime(1000);
    expect(fired()).toEqual(['heavy', 'heavy', 'heavy', 'success']);
  });

  it('돌려받은 함수로 남은 박자를 끊는다 (연속 저장)', () => {
    const cancel = playCelebrationHaptic('big');
    cancel();
    jest.advanceTimersByTime(1000);
    expect(fired()).toEqual(['heavy']);
  });

  it('저장 탭은 selection 한 번', () => {
    saveTapHaptic();
    expect(fired()).toEqual(['selection']);
  });

  it('햅틱 스위치가 꺼져 있으면 축하·저장 탭·막대 쓸기 모두 울리지 않는다', () => {
    setHapticsEnabled(false);
    expect(isHapticsEnabled()).toBe(false);
    playCelebrationHaptic('goal');
    saveTapHaptic();
    scrubTick();
    jest.advanceTimersByTime(1000);
    expect(fired()).toEqual([]);
  });
});
