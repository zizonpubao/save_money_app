import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { EntryForm } from '@/src/components/EntryForm';
import { Screen } from '@/src/components/Screen';
import { useEntryEditor } from '@/src/features/useEntryEditor';
import { useEntryForm } from '@/src/features/useEntryForm';
import { useCategoryStore } from '@/src/store/categoryStore';
import { useTheme } from '@/src/theme';
import { celebrateHaptic } from '@/src/utils/haptics';

export default function EntryEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, type, sp, radius, size } = useTheme();
  const categories = useCategoryStore((s) => s.categories);
  const { entry, save, destroy } = useEntryEditor(id);
  const form = useEntryForm(entry);

  const onSave = () => {
    if (!form.canSave) return;
    try {
      save(form.toInput());
    } catch {
      Alert.alert('저장 실패', '잠시 후 다시 시도해 주세요.');
      return;
    }
    celebrateHaptic();
    router.back();
  };

  const onDelete = () => {
    if (!entry) return;
    Alert.alert('기록 삭제', `"${entry.title}" 기록을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          try {
            destroy();
          } catch {
            Alert.alert('삭제 실패', '잠시 후 다시 시도해 주세요.');
            return;
          }
          router.back();
        },
      },
    ]);
  };

  if (!entry) {
    return (
      <>
        <Stack.Screen options={{ title: '기록 수정' }} />
        <Screen style={styles.center}>
          <Text style={[type.body, { color: colors.text }]}>기록을 찾을 수 없어요</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: sp.md }}>
            <Text style={[type.bodyStrong, { color: colors.primary }]}>돌아가기</Text>
          </Pressable>
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: '기록 수정',
          headerRight: () => (
            <Pressable onPress={onSave} disabled={!form.canSave} hitSlop={sp.sm}>
              <Text
                style={[type.action, { color: form.canSave ? colors.primary : colors.textMuted }]}>
                저장
              </Text>
            </Pressable>
          ),
        }}
      />
      <Screen style={styles.noPadding}>
        <EntryForm form={form} categories={categories}>
          <View style={{ marginTop: sp.md }}>
            <Pressable
              onPress={onDelete}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.delete,
                {
                  borderColor: colors.danger,
                  borderRadius: radius.md,
                  minHeight: size.touch,
                  paddingVertical: sp.smd,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <Text style={[type.bodyStrong, { color: colors.danger }]}>이 기록 삭제</Text>
            </Pressable>
          </View>
        </EntryForm>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  noPadding: { padding: 0 },
  center: { alignItems: 'center', justifyContent: 'center' },
  delete: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
