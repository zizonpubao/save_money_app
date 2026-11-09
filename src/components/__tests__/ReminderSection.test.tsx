import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';

import { ReminderSection } from '@/src/components/ReminderSection';
import { getSetting, initDatabase, resetDatabaseConnection, SETTING_KEYS } from '@/src/db';
import { syncReminders } from '@/src/features/reminderSchedule';
import { useSettingsStore } from '@/src/store/settingsStore';
import { dateAtTime } from '@/src/utils/date';

const alertSpy = jest.spyOn(Alert, 'alert');
const getPermissions = jest.mocked(Notifications.getPermissionsAsync);
const requestPermissions = jest.mocked(Notifications.requestPermissionsAsync);

/** 대역이 돌려줄 권한 결과. 쓰는 값만 넣는다 */
function perm(granted: boolean, canAskAgain = true) {
  const status = granted ? 'granted' : 'denied';
  return { granted, canAskAgain, status, expires: 'never' } as Notifications.NotificationPermissionsStatus;
}

async function toggle(value: boolean) {
  await act(async () => {
    fireEvent(screen.getByLabelText('저녁 기록 알림'), 'valueChange', value);
    await Promise.resolve();
  });
  await act(async () => {
    await syncReminders();
  });
}

describe('설정 "알림" 구획', () => {
  beforeEach(() => {
    resetDatabaseConnection();
    initDatabase();
    useSettingsStore.setState({ loaded: false });
    useSettingsStore.getState().load();
    alertSpy.mockClear();
    alertSpy.mockImplementation(() => undefined);
    getPermissions.mockReset().mockResolvedValue(perm(false));
    requestPermissions.mockReset().mockResolvedValue(perm(true));
  });

  afterAll(() => {
    alertSpy.mockRestore();
    resetDatabaseConnection();
  });

  it('기본은 꺼짐이고 시간 행이 없으며 권한을 묻지 않는다', async () => {
    await render(<ReminderSection />);
    expect(screen.getByLabelText('저녁 기록 알림').props.value).toBe(false);
    expect(screen.queryByText('알림 시간')).toBeNull();
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it('켜면 권한을 묻고 저장하며 기본 시간 21:00 을 보여 준다', async () => {
    await render(<ReminderSection />);
    await toggle(true);
    expect(requestPermissions).toHaveBeenCalledTimes(1);
    expect(getSetting(SETTING_KEYS.reminderEnabled)).toBe('1');
    expect(screen.getByLabelText('저녁 기록 알림').props.value).toBe(true);
    expect(screen.getByText('21:00')).toBeOnTheScreen();
  });

  it('거부하면 스위치가 꺼진 채로 설정 열기 안내를 보여 준다', async () => {
    requestPermissions.mockResolvedValue(perm(false, false));
    await render(<ReminderSection />);
    await toggle(true);
    expect(getSetting(SETTING_KEYS.reminderEnabled)).toBeNull();
    expect(screen.getByLabelText('저녁 기록 알림').props.value).toBe(false);
    expect(alertSpy.mock.calls.at(-1)?.[2]?.map((b) => b.text)).toEqual(['닫기', '설정 열기']);
  });

  it('시간 행을 누르면 시간 휠이 열리고 고른 시간을 저장한다', async () => {
    getPermissions.mockResolvedValue(perm(true));
    await render(<ReminderSection />);
    await toggle(true);
    await fireEvent.press(screen.getByText('알림 시간'));
    const picked = dateAtTime('2026-11-09', '20:15');
    await act(async () => {
      screen.getByTestId('reminder-time-picker').props.onChange({ nativeEvent: { timestamp: picked.getTime() } });
      await syncReminders();
    });
    expect(getSetting(SETTING_KEYS.reminderTime)).toBe('20:15');
    expect(screen.getByText('20:15')).toBeOnTheScreen();
  });

  it('끄면 저장하고 시간 행을 숨긴다', async () => {
    getPermissions.mockResolvedValue(perm(true));
    await render(<ReminderSection />);
    await toggle(true);
    await toggle(false);
    expect(getSetting(SETTING_KEYS.reminderEnabled)).toBe('0');
    expect(screen.queryByText('알림 시간')).toBeNull();
  });
});
