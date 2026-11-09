import * as Notifications from 'expo-notifications';
import { Alert, Linking, type AlertButton } from 'react-native';

import {
  addEntry,
  initDatabase,
  resetDatabaseConnection,
  setSetting,
  SETTING_KEYS,
  type EntryInput,
} from '@/src/db';
import { runDeleteAll, snapshotBackup } from '@/src/features/backupActions';
import { REMINDER_BODY, REMINDER_TITLE, REMINDER_WINDOW_DAYS } from '@/src/features/reminder';
import {
  alertReminderDenied,
  requestReminderPermission,
  syncReminders,
} from '@/src/features/reminderSchedule';
import { useEntryStore } from '@/src/store/entryStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { addDays, dateAtTime, fromDate, today } from '@/src/utils/date';

const schedule = jest.mocked(Notifications.scheduleNotificationAsync);
const cancelAll = jest.mocked(Notifications.cancelAllScheduledNotificationsAsync);
const getPermissions = jest.mocked(Notifications.getPermissionsAsync);
const requestPermissions = jest.mocked(Notifications.requestPermissionsAsync);

/** 대역이 돌려줄 권한 결과. 쓰는 값만 넣는다 */
function perm(granted: boolean, canAskAgain = true) {
  const status = granted ? 'granted' : 'denied';
  return { granted, canAskAgain, status, expires: 'never' } as Notifications.NotificationPermissionsStatus;
}

type Request = { content: { title: string; body: string }; trigger: { type: string; date: Date } };

function scheduledDays(): string[] {
  return schedule.mock.calls.map(([request]) => fromDate((request as Request).trigger.date));
}

function entry(over: Partial<EntryInput> = {}): EntryInput {
  return { date: today(), title: '커피', amount: 4500, categoryId: null, memo: null, ...over };
}

function turnOn(time = '23:59') {
  setSetting(SETTING_KEYS.reminderEnabled, '1');
  setSetting(SETTING_KEYS.reminderTime, time);
}

/** 스토어가 void 로 시작한 동기화까지 끝나길 기다린다 */
async function settle() {
  await syncReminders();
  schedule.mockClear();
  cancelAll.mockClear();
}

describe('매일 기록 알림 예약', () => {
  beforeEach(() => {
    jest.useFakeTimers({
      now: dateAtTime('2026-11-09', '18:00'),
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
    resetDatabaseConnection();
    initDatabase();
    schedule.mockReset().mockResolvedValue('id');
    cancelAll.mockReset().mockResolvedValue(undefined);
    getPermissions.mockReset().mockResolvedValue(perm(true));
    requestPermissions.mockReset().mockResolvedValue(perm(true));
  });

  afterEach(() => jest.useRealTimers());
  afterAll(() => resetDatabaseConnection());

  it('꺼져 있으면(기본값) 취소만 하고 예약하지 않는다', async () => {
    await syncReminders();
    expect(cancelAll).toHaveBeenCalledTimes(1);
    expect(schedule).not.toHaveBeenCalled();
  });

  it('켜져 있으면 문구와 날짜 지정 트리거로 14일치를 예약한다', async () => {
    turnOn();
    await syncReminders();
    expect(schedule).toHaveBeenCalledTimes(REMINDER_WINDOW_DAYS);
    const first = schedule.mock.calls[0]?.[0] as Request;
    expect(first.content).toMatchObject({ title: REMINDER_TITLE, body: REMINDER_BODY });
    expect(first.content.title).toBe('오늘 참은 소비 있나요?');
    expect(first.content.body).toBe('커피 한 잔이라도 좋아요. 적어 두면 쌓여요.');
    expect(first.trigger.type).toBe('date');
    expect(first.trigger.date).toEqual(dateAtTime('2026-11-09', '23:59'));
  });

  it('다시 예약하기 전에 기존 예약을 먼저 지운다', async () => {
    turnOn();
    await syncReminders();
    expect(cancelAll.mock.invocationCallOrder[0]).toBeLessThan(schedule.mock.invocationCallOrder[0] as number);
  });

  it('오늘 기록이 있으면 오늘 몫을 뺀다', async () => {
    turnOn();
    addEntry(entry());
    await syncReminders();
    expect(scheduledDays()).toHaveLength(REMINDER_WINDOW_DAYS - 1);
    expect(scheduledDays()).not.toContain(today());
  });

  it('어제 기록만 있으면 오늘 몫은 남는다', async () => {
    turnOn();
    addEntry(entry({ date: addDays(today(), -1) }));
    await syncReminders();
    expect(scheduledDays()).toContain(today());
  });

  it('권한이 꺼져 있으면 예약하지 않고 권한을 묻지도 않는다', async () => {
    turnOn();
    getPermissions.mockResolvedValue(perm(false));
    await syncReminders();
    expect(schedule).not.toHaveBeenCalled();
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it('네이티브가 실패해도 던지지 않는다', async () => {
    turnOn();
    cancelAll.mockRejectedValue(new Error('no'));
    await expect(syncReminders()).resolves.toMatchObject({ status: 'failed' });
  });

  it('겹쳐 불러도 같은 날을 두 번 예약하지 않고, 마지막 상태로 끝난다', async () => {
    turnOn();
    const first = syncReminders();
    void syncReminders();
    void syncReminders();
    await first;
    expect(cancelAll).toHaveBeenCalledTimes(2);
    expect(schedule).toHaveBeenCalledTimes(REMINDER_WINDOW_DAYS * 2);
  });

  describe('다시 맞추는 때', () => {
    beforeEach(() => {
      turnOn();
      useEntryStore.setState({ oldestMonth: today().slice(0, 7), homeMonth: today().slice(0, 7) });
    });

    it('openHome', async () => {
      useEntryStore.getState().openHome();
      await syncReminders();
      expect(schedule).toHaveBeenCalled();
      expect(requestPermissions).not.toHaveBeenCalled();
    });

    it('저장하면 오늘 몫이 빠진다', async () => {
      useEntryStore.getState().add(entry());
      await syncReminders();
      expect(scheduledDays()).not.toContain(today());
    });

    it('삭제해서 오늘 기록이 없어지면 오늘 몫이 돌아온다', async () => {
      const saved = useEntryStore.getState().add(entry());
      await settle();
      useEntryStore.getState().remove(saved.id);
      await syncReminders();
      expect(scheduledDays()).toContain(today());
    });

    it('수정으로 날짜를 옮겨도 다시 맞춘다', async () => {
      const saved = useEntryStore.getState().add(entry());
      await settle();
      useEntryStore.getState().update(saved.id, entry({ date: addDays(today(), -1) }));
      await syncReminders();
      expect(scheduledDays()).toContain(today());
    });

    it('시간을 바꾸면 새 시각으로 예약한다', async () => {
      await settle();
      useSettingsStore.getState().setReminderTime('22:30');
      await syncReminders();
      expect((schedule.mock.calls[0]?.[0] as Request).trigger.date).toEqual(dateAtTime('2026-11-09', '22:30'));
    });

    it('스위치를 끄면 취소만 한다', async () => {
      await settle();
      useSettingsStore.getState().setReminderEnabled(false);
      await syncReminders();
      expect(cancelAll).toHaveBeenCalled();
      expect(schedule).not.toHaveBeenCalled();
    });

    it('데이터 전체 삭제면 설정이 지워지고 예약도 취소된다', async () => {
      const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      await settle();
      runDeleteAll();
      await syncReminders();
      expect(cancelAll).toHaveBeenCalled();
      expect(schedule).not.toHaveBeenCalled();
      expect(useSettingsStore.getState()).toMatchObject({ reminderEnabled: false, reminderTime: '21:00' });
      alert.mockRestore();
    });
  });

  it('알림 설정은 JSON 백업에 들어가지 않는다', () => {
    turnOn();
    expect(JSON.stringify(snapshotBackup())).not.toContain('reminder');
  });
});

describe('알림 권한', () => {
  beforeEach(() => {
    getPermissions.mockReset();
    requestPermissions.mockReset();
  });

  it('이미 허용이면 다시 묻지 않는다', async () => {
    getPermissions.mockResolvedValue(perm(true));
    await expect(requestReminderPermission()).resolves.toBe(true);
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it('아직 안 물었으면 묻고 결과를 따른다', async () => {
    getPermissions.mockResolvedValue(perm(false));
    requestPermissions.mockResolvedValue(perm(false, false));
    await expect(requestReminderPermission()).resolves.toBe(false);
    expect(requestPermissions).toHaveBeenCalledTimes(1);
  });

  it('이미 거부해 다시 물을 수 없으면 묻지 않는다', async () => {
    getPermissions.mockResolvedValue(perm(false, false));
    await expect(requestReminderPermission()).resolves.toBe(false);
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it('네이티브가 실패하면 false', async () => {
    getPermissions.mockRejectedValue(new Error('no'));
    await expect(requestReminderPermission()).resolves.toBe(false);
  });

  it('거부 안내의 "설정 열기" 는 아이폰 설정을 연다', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    alertReminderDenied();
    const buttons = alert.mock.calls.at(-1)?.[2] as AlertButton[];
    buttons.find((b) => b.text === '설정 열기')?.onPress?.();
    expect(open).toHaveBeenCalledTimes(1);
    alert.mockRestore();
    open.mockRestore();
  });
});
