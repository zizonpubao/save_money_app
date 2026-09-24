import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { GoalModal } from '@/src/components/GoalModal';
import { Screen } from '@/src/components/Screen';
import { SettingsChipsRow, SettingsRow, SettingsSwitchRow } from '@/src/components/SettingsRow';
import { SettingsSection } from '@/src/components/SettingsSection';
import { SOUND_LABELS, useCelebrationSound } from '@/src/features/useCelebrationSound';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTheme } from '@/src/theme';
import { previewHaptic } from '@/src/utils/haptics';
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
  // 미리 듣기: 홈과 같은 파일·같은 재생 경로라, 여기서 안 들리면 무음 스위치·기기 볼륨 문제다
  const playSound = useCelebrationSound();
  const soundChips = (Object.keys(SOUND_LABELS) as (keyof typeof SOUND_LABELS)[]).map((sound) => ({
    label: SOUND_LABELS[sound],
    accessibilityLabel: `${SOUND_LABELS[sound]} 미리 듣기`,
    onPress: () => playSound(sound),
  }));

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
        {/* (M4) 저장 축하 효과음·햅틱 + 미리 듣기/느껴 보기 */}
        <SettingsSection title="효과">
          {/* 스위치와 그 아래 칩 줄은 한 덩어리라 스위치 행에는 구분선을 긋지 않는다 (isLast) */}
          <SettingsSwitchRow
            label="효과음"
            value={soundEnabled}
            onValueChange={toggle(setSoundEnabled)}
            isLast
          />
          <SettingsChipsRow
            testID="sound-preview"
            chips={soundChips}
            disabled={!soundEnabled}
            note="무음 스위치가 켜져 있으면 나지 않습니다"
          />
          <SettingsSwitchRow
            label="햅틱"
            value={hapticsEnabled}
            onValueChange={toggle(setHapticsEnabled)}
            isLast
          />
          <SettingsChipsRow
            testID="haptic-preview"
            chips={[{ label: '진동 느껴 보기', accessibilityLabel: '진동 느껴 보기', onPress: previewHaptic }]}
            disabled={!hapticsEnabled}
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
