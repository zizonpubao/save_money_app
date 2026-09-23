import { fireEvent, render, screen } from '@testing-library/react-native';

import SettingsScreen from '@/app/(tabs)/settings';
import {
  getSetting,
  initDatabase,
  resetDatabaseConnection,
  setSetting,
  SETTING_KEYS,
} from '@/src/db';
import { useSettingsStore } from '@/src/store/settingsStore';

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
