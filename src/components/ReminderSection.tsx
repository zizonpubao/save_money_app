import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import { SettingsChipsRow, SettingsRow, SettingsSwitchRow } from '@/src/components/SettingsRow';
import { SettingsSection } from '@/src/components/SettingsSection';
import {
  REMINDER_LABEL,
  REMINDER_PLAN_OFF,
  REMINDER_TEST_DELAY_S,
  reminderEnabledAlert,
  reminderStatusText,
  type ReminderPlan,
} from '@/src/features/reminder';
import {
  alertReminderDenied,
  requestReminderPermission,
  sendTestReminder,
  syncReminders,
} from '@/src/features/reminderSchedule';
import { useEntryStore } from '@/src/store/entryStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTheme } from '@/src/theme';
import { dateAtTime, formatTime, today } from '@/src/utils/date';

const SAVE_FAILED: [string, string] = ['저장 실패', '잠시 후 다시 시도해 주세요.'];

/**
 * 설정 탭 "알림" 구획: 매일 기록 알림 스위치(기본 꺼짐), 시간 선택(기본 21:00), 미리 보기 칩.
 * 칩 아래 회색 한 줄은 실제 예약 상태("다음 알림은 오늘 21:00")를 보여 준다 — 알림이 왜 안 오는지 화면에서 알 수 있게.
 */
export function ReminderSection() {
  const { colors, isDark } = useTheme();
  const enabled = useSettingsStore((s) => s.reminderEnabled);
  const time = useSettingsStore((s) => s.reminderTime);
  const setEnabled = useSettingsStore((s) => s.setReminderEnabled);
  const setTime = useSettingsStore((s) => s.setReminderTime);
  // 오늘 기록이 생기거나 없어지면 오늘 몫 예약이 바뀌므로 안내 줄도 다시 읽는다
  const todayTotal = useEntryStore((s) => s.todayTotal);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [plan, setPlan] = useState<ReminderPlan>(REMINDER_PLAN_OFF);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void syncReminders().then((next) => {
      if (alive) setPlan(next);
    });
    return () => {
      alive = false;
    };
  }, [enabled, time, todayTotal]);

  const save = (apply: () => void): boolean => {
    try {
      apply();
      return true;
    } catch {
      Alert.alert(...SAVE_FAILED);
      return false;
    }
  };

  // 권한은 켜는 순간 처음 묻는다. 거부되면 저장하지 않아 스위치가 꺼진 자리로 돌아간다
  const onToggle = async (next: boolean) => {
    if (!next) {
      setPickerOpen(false);
      save(() => setEnabled(false));
      return;
    }
    if (!(await requestReminderPermission())) {
      alertReminderDenied();
      return;
    }
    if (!save(() => setEnabled(true))) return;
    // 켰다는 걸 알 수 있게, 실제로 예약된 결과를 확인 창으로 보여 준다
    const result = await syncReminders();
    setPlan(result);
    const { title, message } = reminderEnabledAlert(result, time, new Date());
    Alert.alert(title, message);
  };

  const onTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'set' && selected) save(() => setTime(formatTime(selected)));
  };

  const pickerValue = dateAtTime(today(), time);

  // 기록 입력의 날짜 칸과 같은 방식: iOS 는 행 아래 휠, Android 는 명령형 다이얼로그
  const onTimePress = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: pickerValue, mode: 'time', is24Hour: true, onChange: onTimeChange });
      return;
    }
    setPickerOpen((open) => !open);
  };

  const onPreview = async () => {
    if (await sendTestReminder()) {
      Alert.alert(`${REMINDER_TEST_DELAY_S}초 뒤에 알림이 와요`, '실제 알림과 같은 모양이에요.');
    } else {
      alertReminderDenied();
    }
  };

  const status = enabled ? reminderStatusText(plan, new Date()) : null;

  return (
    <SettingsSection title="알림">
      <SettingsSwitchRow
        label={REMINDER_LABEL}
        value={enabled}
        onValueChange={(next) => void onToggle(next)}
        isLast={!enabled}
      />
      {enabled ? <SettingsRow label="알림 시간" value={time} onPress={onTimePress} /> : null}
      {enabled && pickerOpen ? (
        <View style={{ backgroundColor: colors.card }}>
          <DateTimePicker
            testID="reminder-time-picker"
            value={pickerValue}
            mode="time"
            display="spinner"
            locale="ko-KR"
            themeVariant={isDark ? 'dark' : 'light'}
            onChange={onTimeChange}
          />
        </View>
      ) : null}
      {enabled ? (
        <SettingsChipsRow
          testID="reminder-preview"
          label="알림 확인"
          chips={[{ label: '알림 미리 보기', accessibilityLabel: '알림 미리 보기', onPress: () => void onPreview() }]}
          note={status ?? undefined}
          isLast
        />
      ) : null}
    </SettingsSection>
  );
}
