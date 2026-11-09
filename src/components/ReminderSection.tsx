import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import { SettingsRow, SettingsSwitchRow } from '@/src/components/SettingsRow';
import { SettingsSection } from '@/src/components/SettingsSection';
import { alertReminderDenied, requestReminderPermission } from '@/src/features/reminderSchedule';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTheme } from '@/src/theme';
import { dateAtTime, formatTime, today } from '@/src/utils/date';

const SAVE_FAILED: [string, string] = ['저장 실패', '잠시 후 다시 시도해 주세요.'];

/** 설정 탭 "알림" 구획: 저녁 기록 알림 스위치(기본 꺼짐)와 시간 선택(기본 21:00) */
export function ReminderSection() {
  const { colors, isDark } = useTheme();
  const enabled = useSettingsStore((s) => s.reminderEnabled);
  const time = useSettingsStore((s) => s.reminderTime);
  const setEnabled = useSettingsStore((s) => s.setReminderEnabled);
  const setTime = useSettingsStore((s) => s.setReminderTime);
  const [pickerOpen, setPickerOpen] = useState(false);

  const save = (apply: () => void) => {
    try {
      apply();
    } catch {
      Alert.alert(...SAVE_FAILED);
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
    save(() => setEnabled(true));
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

  return (
    <SettingsSection title="알림">
      <SettingsSwitchRow
        label="저녁 기록 알림"
        value={enabled}
        onValueChange={(next) => void onToggle(next)}
        isLast={!enabled}
      />
      {enabled ? <SettingsRow label="알림 시간" value={time} onPress={onTimePress} isLast /> : null}
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
    </SettingsSection>
  );
}
