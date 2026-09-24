import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import type * as AudioMock from '@/__mocks__/expo-audio';
import SettingsScreen from '@/app/(tabs)/settings';
import {
  getSetting,
  initDatabase,
  resetDatabaseConnection,
  setSetting,
  SETTING_KEYS,
} from '@/src/db';
import { SOUND_FILES } from '@/src/features/useCelebrationSound';
import { useSettingsStore } from '@/src/store/settingsStore';
import { setHapticsEnabled } from '@/src/utils/haptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
}));

// jest 는 모든 에셋을 같은 값(1)으로 바꾸므로, 어느 파일을 재생했는지 가리려고 파일마다 다른 id 를 준다
jest.mock('../../../assets/sounds/tap.wav', () => 101);
jest.mock('../../../assets/sounds/ding.wav', () => 102);
jest.mock('../../../assets/sounds/tada.wav', () => 103);
jest.mock('../../../assets/sounds/fanfare.wav', () => 104);

const { mockPlayers } = jest.requireMock<typeof AudioMock>('expo-audio');

/** 재생된 효과음 이름들 */
function soundsPlayed(): string[] {
  const names = Object.entries(SOUND_FILES);
  return mockPlayers.flatMap((p) =>
    p.play.mock.calls.map(() => names.find(([, id]) => id === p.source)?.[0] ?? '?'),
  );
}

describe('설정 화면 — 월 목표', () => {
  beforeEach(() => {
    resetDatabaseConnection();
    initDatabase();
    useSettingsStore.setState({ monthlyGoal: null, loaded: false });
  });

  afterAll(() => {
    resetDatabaseConnection();
  });

  it('"목표" 섹션에 "월 목표 금액" 행이 있고 목표가 없으면 "없음"', async () => {
    await render(<SettingsScreen />);
    expect(screen.getByText('목표')).toBeOnTheScreen();
    expect(screen.getByText('월 목표 금액')).toBeOnTheScreen();
    expect(screen.getByText('없음')).toBeOnTheScreen();
  });

  it('DB 에 목표가 있으면 행에 금액으로 보인다', async () => {
    setSetting(SETTING_KEYS.monthlyGoal, '200000');
    await render(<SettingsScreen />);
    expect(screen.getByText('200,000원')).toBeOnTheScreen();
  });

  it('프리셋 칩을 탭하면 입력값이 그 금액이 되고, 저장하면 행과 DB 에 반영된다', async () => {
    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByText('월 목표 금액'));
    expect(screen.getByText('10만')).toBeOnTheScreen();
    expect(screen.getByText('50만')).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('30만'));
    expect(screen.getByLabelText('월 목표 금액').props.value).toBe('300,000');

    await fireEvent.press(screen.getByText('저장'));
    expect(screen.getByText('300,000원')).toBeOnTheScreen();
    expect(useSettingsStore.getState().monthlyGoal).toBe(300000);
    expect(getSetting(SETTING_KEYS.monthlyGoal)).toBe('300000');
  });

  it('직접 입력하면 콤마가 붙고, 비어 있으면 저장되지 않는다', async () => {
    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByText('월 목표 금액'));
    const input = screen.getByLabelText('월 목표 금액');

    await fireEvent.press(screen.getByText('저장'));
    expect(useSettingsStore.getState().monthlyGoal).toBeNull();

    await fireEvent.changeText(input, '250000');
    expect(screen.getByLabelText('월 목표 금액').props.value).toBe('250,000');
  });

  it('"목표 없애기" 를 누르면 행이 "없음" 으로 돌아가고 DB 에서도 지워진다', async () => {
    setSetting(SETTING_KEYS.monthlyGoal, '300000');
    await render(<SettingsScreen />);
    expect(screen.getByText('300,000원')).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('월 목표 금액'));
    await fireEvent.press(screen.getByText('목표 없애기'));
    expect(screen.getByText('없음')).toBeOnTheScreen();
    expect(getSetting(SETTING_KEYS.monthlyGoal)).toBeNull();
  });

  it('목표가 없을 땐 "목표 없애기" 버튼이 없다', async () => {
    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByText('월 목표 금액'));
    expect(screen.queryByText('목표 없애기')).toBeNull();
  });
});

describe('설정 화면 — 효과 (M4)', () => {
  beforeEach(() => {
    resetDatabaseConnection();
    initDatabase();
    useSettingsStore.setState({ monthlyGoal: null, soundEnabled: true, hapticsEnabled: true, loaded: false });
  });

  afterAll(() => {
    resetDatabaseConnection();
    // 다른 테스트 파일에 햅틱 꺼짐이 새지 않게 (모듈 상태)
    setHapticsEnabled(true);
  });

  it('"효과" 섹션에 효과음·햅틱 스위치가 있고 기본은 켬', async () => {
    await render(<SettingsScreen />);
    expect(screen.getByText('효과')).toBeOnTheScreen();
    expect(screen.getByLabelText('효과음').props.value).toBe(true);
    expect(screen.getByLabelText('햅틱').props.value).toBe(true);
  });

  it("효과음 스위치를 끄면 DB 에 '0' 으로 저장되고 스위치가 꺼진다", async () => {
    await render(<SettingsScreen />);
    await fireEvent(screen.getByLabelText('효과음'), 'valueChange', false);
    expect(getSetting(SETTING_KEYS.soundEnabled)).toBe('0');
    expect(screen.getByLabelText('효과음').props.value).toBe(false);
    expect(useSettingsStore.getState().soundEnabled).toBe(false);
  });

  it("햅틱 스위치를 끄면 DB 에 '0', 다시 켜면 '1'", async () => {
    await render(<SettingsScreen />);
    await fireEvent(screen.getByLabelText('햅틱'), 'valueChange', false);
    expect(getSetting(SETTING_KEYS.hapticsEnabled)).toBe('0');
    await fireEvent(screen.getByLabelText('햅틱'), 'valueChange', true);
    expect(getSetting(SETTING_KEYS.hapticsEnabled)).toBe('1');
  });

  it('DB 에 꺼 둔 값이 있으면 열 때 꺼진 채로 보인다', async () => {
    setSetting(SETTING_KEYS.soundEnabled, '0');
    await render(<SettingsScreen />);
    expect(screen.getByLabelText('효과음').props.value).toBe(false);
    expect(screen.getByLabelText('햅틱').props.value).toBe(true);
  });

  it('효과음 스위치 아래 "톡·띵·짠·팡파르" 미리 듣기 칩과 무음 스위치 안내가 있고, 탭하면 그 소리만 난다', async () => {
    mockPlayers.length = 0;
    await render(<SettingsScreen />);
    for (const label of ['톡', '띵', '짠', '팡파르']) {
      expect(screen.getByLabelText(`${label} 미리 듣기`)).toBeOnTheScreen();
    }
    expect(screen.getByText('무음 스위치가 켜져 있으면 나지 않습니다')).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText('톡 미리 듣기'));
    expect(soundsPlayed()).toEqual(['tap']);
    await fireEvent.press(screen.getByLabelText('팡파르 미리 듣기'));
    expect(soundsPlayed()).toEqual(['tap', 'fanfare']);
  });

  it('효과음을 끄면 미리 듣기 칩이 비활성이 되고 눌러도 소리가 나지 않는다', async () => {
    mockPlayers.length = 0;
    setSetting(SETTING_KEYS.soundEnabled, '0');
    await render(<SettingsScreen />);
    const chip = screen.getByLabelText('띵 미리 듣기');
    expect(chip).toBeDisabled();
    await fireEvent.press(chip);
    expect(soundsPlayed()).toEqual([]);
  });

  it('햅틱 스위치 아래 "진동 느껴 보기" 를 누르면 Medium 한 번, 햅틱을 끄면 비활성', async () => {
    jest.mocked(Haptics.impactAsync).mockClear();
    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByLabelText('진동 느껴 보기'));
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);

    await fireEvent(screen.getByLabelText('햅틱'), 'valueChange', false);
    expect(screen.getByLabelText('진동 느껴 보기')).toBeDisabled();
    await fireEvent.press(screen.getByLabelText('진동 느껴 보기'));
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  });
});
