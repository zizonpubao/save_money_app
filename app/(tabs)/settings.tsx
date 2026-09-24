import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { GoalModal } from '@/src/components/GoalModal';
import { Screen } from '@/src/components/Screen';
import { SettingsRow, SettingsSwitchRow } from '@/src/components/SettingsRow';
import { SettingsSection } from '@/src/components/SettingsSection';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTheme } from '@/src/theme';
import { formatWon } from '@/src/utils/money';

/** 설정 탭. "목표" · (M4) "효과" 섹션, M5 에서 백업·복원·카테고리 섹션이 아래로 붙는다. */
export default function SettingsScreen() {
  const { sp } = useTheme();
  const monthlyGoal = useSettingsStore((s) => s.monthlyGoal);
  const loaded = useSettingsStore((s) => s.loaded);
  const load = useSettingsStore((s) => s.load);
  const setGoal = useSettingsStore((s) => s.setGoal);
  const clearGoal = useSettingsStore((s) => s.clearGoal);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const setHapticsEnabled = useSettingsStore((s) => s.setHapticsEnabled);
  const [goalModalVisible, setGoalModalVisible] = useState(false);

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  const saveGoal = (goal: number) => {
    try {
      setGoal(goal);
    } catch {
      Alert.alert('저장 실패', '잠시 후 다시 시도해 주세요.');
      return;
    }
    setGoalModalVisible(false);
  };

  const removeGoal = () => {
    try {
      clearGoal();
    } catch {
      Alert.alert('삭제 실패', '잠시 후 다시 시도해 주세요.');
      return;
    }
    setGoalModalVisible(false);
  };

  // 스위치는 바로 저장한다. 실패하면 스토어 값이 그대로라 스위치도 원래 자리로 돌아간다
  const toggle = (apply: (enabled: boolean) => void) => (enabled: boolean) => {
    try {
      apply(enabled);
    } catch {
      Alert.alert('저장 실패', '잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <Screen style={styles.noPadding}>
      <ScrollView contentContainerStyle={{ padding: sp.md, paddingTop: 0, paddingBottom: sp.xl }}>
        <SettingsSection title="목표">
          <SettingsRow
            label="월 목표 금액"
            value={monthlyGoal !== null ? formatWon(monthlyGoal) : '없음'}
            onPress={() => setGoalModalVisible(true)}
            isLast
          />
        </SettingsSection>
        {/* (M4) 저장 축하 효과음·햅틱. 무음 스위치가 켜져 있으면 효과음은 원래 안 난다 */}
        <SettingsSection title="효과">
          <SettingsSwitchRow label="효과음" value={soundEnabled} onValueChange={toggle(setSoundEnabled)} />
          <SettingsSwitchRow
            label="햅틱"
            value={hapticsEnabled}
            onValueChange={toggle(setHapticsEnabled)}
            isLast
          />
        </SettingsSection>
      </ScrollView>

      <GoalModal
        visible={goalModalVisible}
        current={monthlyGoal}
        onSave={saveGoal}
        onClear={removeGoal}
        onClose={() => setGoalModalVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  noPadding: { padding: 0 },
});
