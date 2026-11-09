import * as Notifications from 'expo-notifications';
import { Alert, Linking, Platform } from 'react-native';

import { getSetting, getSumByDate, SETTING_KEYS } from '@/src/db';
import { fromDate } from '@/src/utils/date';

import {
  parseReminderEnabled,
  parseReminderTime,
  REMINDER_BODY,
  REMINDER_TITLE,
  reminderDates,
} from './reminder';

/**
 * 기기 내 로컬 알림 예약. 서버·푸시를 쓰지 않아 푸시 토큰 API 는 부르지 않는다.
 * 매일 반복 트리거는 "오늘 이미 기록했으면 울리지 않기" 를 할 수 없어서, 날짜 지정 예약을 통째로 다시 만든다.
 */

const ANDROID_CHANNEL_ID = 'evening-reminder';

async function syncOnce(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!parseReminderEnabled(getSetting(SETTING_KEYS.reminderEnabled))) return;
  // 아이폰 설정에서 권한을 끈 경우. 스위치 값은 두고 예약만 건너뛰어, 권한을 다시 켜면 다음 동기화에서 살아난다
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;

  const now = new Date();
  const dates = reminderDates({
    now,
    time: parseReminderTime(getSetting(SETTING_KEYS.reminderTime)),
    hasEntryToday: getSumByDate(fromDate(now)) > 0,
  });
  for (const date of dates) {
    await Notifications.scheduleNotificationAsync({
      content: { title: REMINDER_TITLE, body: REMINDER_BODY, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
  }
}

let running: Promise<void> | null = null;
let rerun = false;

/**
 * 예약을 전부 취소하고 지금 상태로 다시 만든다. 실패해도 던지지 않는다 (알림 때문에 저장·화면이 막히면 안 된다).
 * 취소·예약이 비동기라 겹치면 같은 날이 두 번 예약되므로, 진행 중이면 끝난 뒤 한 번만 더 돈다.
 */
export function syncReminders(): Promise<void> {
  if (running) {
    rerun = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        rerun = false;
        await syncOnce();
      } while (rerun);
    } catch {
      // 다음 앱 열기·저장 때 다시 맞춰진다
    } finally {
      running = null;
    }
  })();
  return running;
}

/** 알림 권한을 확인하고 필요하면 요청한다. 스위치를 켤 때만 부른다 */
export async function requestReminderPermission(): Promise<boolean> {
  try {
    // Android 13+ 는 채널이 하나도 없으면 권한 창이 뜨지 않는다
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: '저녁 기록 알림',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true },
    });
    return asked.granted;
  } catch {
    return false;
  }
}

export function alertReminderDenied(): void {
  Alert.alert('알림을 켤 수 없어요', '아이폰 설정에서 SaveLog 알림을 켤 수 있어요.', [
    { text: '닫기', style: 'cancel' },
    { text: '설정 열기', onPress: () => void Linking.openSettings() },
  ]);
}
