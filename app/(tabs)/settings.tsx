import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { GoalModal } from '@/src/components/GoalModal';
import { Screen } from '@/src/components/Screen';
import { SettingsRow } from '@/src/components/SettingsRow';
import { SettingsSection } from '@/src/components/SettingsSection';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTheme } from '@/src/theme';
import { formatWon } from '@/src/utils/money';

/** 설정 탭. 지금은 "목표" 섹션 하나, M5 에서 백업·복원·카테고리 섹션이 아래로 붙는다. */
export default function SettingsScreen() {
  const { sp } = useTheme();
  const monthlyGoal = useSettingsStore((s) => s.monthlyGoal);
  const loaded = useSettingsStore((s) => s.loaded);
  const load = useSettingsStore((s) => s.load);
  const setGoal = useSettingsStore((s) => s.setGoal);
  const clearGoal = useSettingsStore((s) => s.clearGoal);
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
