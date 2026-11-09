import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';

import { ReminderSection } from '@/src/components/ReminderSection';
import { addEntry, getSetting, initDatabase, resetDatabaseConnection, SETTING_KEYS } from '@/src/db';
import { syncReminders } from '@/src/features/reminderSchedule';
import { useSettingsStore } from '@/src/store/settingsStore';
import { dateAtTime, today } from '@/src/utils/date';

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
    fireEvent(screen.getByLabelText('매일 기록 알림'), 'valueChange', value);
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
    // 남은 예약 목록은 "이 테스트에서 예약한 것 전부" 로 되돌린다 (앞 테스트가 덮어쓴 값이 넘어오지 않게)
    const schedule = jest.mocked(Notifications.scheduleNotificationAsync);
    schedule.mockClear();
    jest
      .mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockReset()
      .mockImplementation(() => Promise.resolve(schedule.mock.calls.map(([request]) => request) as never));
  });

  afterAll(() => {
    alertSpy.mockRestore();
    resetDatabaseConnection();
  });

  it('기본은 꺼짐이고 시간 행이 없으며 권한을 묻지 않는다', async () => {
    await render(<ReminderSection />);
    expect(screen.getByLabelText('매일 기록 알림').props.value).toBe(false);
    expect(screen.queryByText('알림 시간')).toBeNull();
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it('켜면 권한을 묻고 저장하며 기본 시간 21:00 을 보여 준다', async () => {
    await render(<ReminderSection />);
    await toggle(true);
    expect(requestPermissions).toHaveBeenCalledTimes(1);
    expect(getSetting(SETTING_KEYS.reminderEnabled)).toBe('1');
    expect(screen.getByLabelText('매일 기록 알림').props.value).toBe(true);
    expect(screen.getByText('21:00')).toBeOnTheScreen();
  });

  it('거부하면 스위치가 꺼진 채로 설정 열기 안내를 보여 준다', async () => {
    requestPermissions.mockResolvedValue(perm(false, false));
    await render(<ReminderSection />);
    await toggle(true);
    expect(getSetting(SETTING_KEYS.reminderEnabled)).toBeNull();
    expect(screen.getByLabelText('매일 기록 알림').props.value).toBe(false);
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

  it('켜면 확인 창이 뜨고 실제 예약된 다음 알림 시각을 알려 준다', async () => {
    getPermissions.mockResolvedValue(perm(true));
    await render(<ReminderSection />);
    await toggle(true);
    const [title, message] = alertSpy.mock.calls.at(-1) ?? [];
    expect(title).toBe('기록 알림을 켰어요');
    expect(message).toContain('매일 21:00에 알려 드려요.');
    expect(message).toMatch(/다음 알림은 (오늘|내일) 21:00이에요\./);
  });

  it('켜져 있으면 미리 보기 칩 아래에 다음 알림 시각이 보인다', async () => {
    getPermissions.mockResolvedValue(perm(true));
    await render(<ReminderSection />);
    await toggle(true);
    expect(screen.getByText(/^다음 알림은 (오늘|내일) 21:00$/)).toBeOnTheScreen();
  });

  it('오늘 이미 기록했으면 안내 줄과 확인 창이 그 이유를 알려 준다', async () => {
    getPermissions.mockResolvedValue(perm(true));
    addEntry({ date: today(), title: '커피', amount: 4500, categoryId: null, memo: null });
    await render(<ReminderSection />);
    await toggle(true);
    expect(screen.getByText('오늘은 이미 기록했어요. 다음 알림은 내일 21:00')).toBeOnTheScreen();
    expect(alertSpy.mock.calls.at(-1)?.[1]).toContain('오늘은 이미 기록해서 내일 21:00부터 울려요.');
  });

  it('예약이 조용히 무시되면(남은 예약 0개) 켰다고 하지 않고 실패를 알린다', async () => {
    getPermissions.mockResolvedValue(perm(true));
    jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([]);
    await render(<ReminderSection />);
    await toggle(true);
    expect(alertSpy.mock.calls.at(-1)?.[0]).toBe('알림을 예약하지 못했어요');
    expect(screen.getByText('알림을 예약하지 못했어요. 스위치를 껐다 켜 보세요')).toBeOnTheScreen();
  });

  it('"알림 미리 보기" 를 누르면 몇 초 뒤 알림 하나를 예약하고 안내한다', async () => {
    getPermissions.mockResolvedValue(perm(true));
    await render(<ReminderSection />);
    await toggle(true);
    const schedule = jest.mocked(Notifications.scheduleNotificationAsync);
    schedule.mockClear();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('알림 미리 보기'));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const request = schedule.mock.calls.at(-1)?.[0] as { trigger: { type: string; seconds: number } };
    expect(request.trigger).toMatchObject({ type: 'timeInterval', seconds: 5 });
    expect(alertSpy.mock.calls.at(-1)?.[0]).toBe('5초 뒤에 알림이 와요');
  });

  it('꺼져 있으면 미리 보기 칩과 안내 줄이 없다', async () => {
    await render(<ReminderSection />);
    expect(screen.queryByLabelText('알림 미리 보기')).toBeNull();
    expect(screen.queryByText(/다음 알림은/)).toBeNull();
  });
});
