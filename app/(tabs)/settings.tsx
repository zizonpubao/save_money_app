import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { AmountPresetsModal } from '@/src/components/AmountPresetsModal';
import { CategoryModal } from '@/src/components/CategoryModal';
import { CategoryRow } from '@/src/components/CategoryRow';
import { GoalModal } from '@/src/components/GoalModal';
import { Screen } from '@/src/components/Screen';
import {
  SettingsChipsRow,
  SettingsInfoRow,
  SettingsRow,
  SettingsSwitchRow,
} from '@/src/components/SettingsRow';
import { SettingsSection } from '@/src/components/SettingsSection';
import type { Category } from '@/src/db';
import { presetsPreview, type AmountPreset } from '@/src/features/amountPresets';
import { confirmDeleteAll, exportCsv, exportJson, startRestore } from '@/src/features/backupActions';
import { moveCategory } from '@/src/features/categoryActions';
import { SOUND_LABELS, useCelebrationSound } from '@/src/features/useCelebrationSound';
import { useCategoryStore } from '@/src/store/categoryStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTheme } from '@/src/theme';
import { previewHaptic } from '@/src/utils/haptics';
import { formatWon } from '@/src/utils/money';

/** 앱 버전 (app.json expo.version). 읽지 못하면 대시 */
const APP_VERSION = Constants.expoConfig?.version ?? '-';

/** 카테고리 모달 상태: 닫힘 / 새로 추가 / 이 카테고리 편집 */
type CategoryEditing = { mode: 'closed' } | { mode: 'add' } | { mode: 'edit'; category: Category };

/** 설정 탭. 목표 · 입력 · (M4) 효과 · (M5) 백업 · 카테고리 · 앱 정보 섹션 */
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
  const amountPresets = useSettingsStore((s) => s.amountPresets);
  const setAmountPresets = useSettingsStore((s) => s.setAmountPresets);
  const resetAmountPresets = useSettingsStore((s) => s.resetAmountPresets);
  const [presetsModalVisible, setPresetsModalVisible] = useState(false);
  const categories = useCategoryStore((s) => s.categories);
  const categoriesLoaded = useCategoryStore((s) => s.loaded);
  const reloadCategories = useCategoryStore((s) => s.reload);
  const [editing, setEditing] = useState<CategoryEditing>({ mode: 'closed' });
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

  useEffect(() => {
    if (!categoriesLoaded) reloadCategories();
  }, [categoriesLoaded, reloadCategories]);

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

  const savePresets = (values: AmountPreset[]) => {
    try {
      setAmountPresets(values);
    } catch {
      Alert.alert('저장 실패', '잠시 후 다시 시도해 주세요.');
      return;
    }
    setPresetsModalVisible(false);
  };

  const restorePresets = () => {
    try {
      resetAmountPresets();
    } catch {
      Alert.alert('저장 실패', '잠시 후 다시 시도해 주세요.');
      return;
    }
    setPresetsModalVisible(false);
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
        {/* 입력 시트 금액 칸 아래 프리셋 칩 5개 */}
        <SettingsSection title="입력">
          <SettingsRow
            label="빠른 금액 버튼"
            value={presetsPreview(amountPresets)}
            onPress={() => setPresetsModalVisible(true)}
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
        {/* (M5) 전체 데이터를 파일로 내보내고 되돌리기 */}
        <SettingsSection title="백업">
          <SettingsRow label="JSON 으로 내보내기" onPress={() => void exportJson()} />
          <SettingsRow label="JSON 에서 복원" onPress={() => void startRestore()} />
          <SettingsRow label="CSV 로 내보내기" onPress={() => void exportCsv()} isLast />
        </SettingsSection>
        {/* (M5) 행을 누르면 편집, 화살표로 순서 변경. 맨 아래 "카테고리 추가" */}
        <SettingsSection title="카테고리">
          {categories.map((category, index) => (
            <CategoryRow
              key={category.id}
              category={category}
              onPress={(c) => setEditing({ mode: 'edit', category: c })}
              onMoveUp={() => moveCategory(categories, index, -1)}
              onMoveDown={() => moveCategory(categories, index, 1)}
              canMoveUp={index > 0}
              canMoveDown={index < categories.length - 1}
            />
          ))}
          <SettingsRow label="카테고리 추가" onPress={() => setEditing({ mode: 'add' })} accent isLast />
        </SettingsSection>
        <SettingsSection title="앱 정보">
          <SettingsInfoRow label="버전" value={APP_VERSION} />
          <SettingsRow label="데이터 전체 삭제" onPress={confirmDeleteAll} danger isLast />
        </SettingsSection>
      </ScrollView>

      <GoalModal
        visible={goalModalVisible}
        current={monthlyGoal}
        onSave={saveGoal}
        onClear={removeGoal}
        onClose={() => setGoalModalVisible(false)}
      />

      <AmountPresetsModal
        visible={presetsModalVisible}
        current={amountPresets}
        onSave={savePresets}
        onReset={restorePresets}
        onClose={() => setPresetsModalVisible(false)}
      />

      <CategoryModal
        visible={editing.mode !== 'closed'}
        category={editing.mode === 'edit' ? editing.category : null}
        onClose={() => setEditing({ mode: 'closed' })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  noPadding: { padding: 0 },
});
