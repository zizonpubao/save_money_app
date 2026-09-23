import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/src/theme';

type Props = PropsWithChildren<{ title: string }>;

/**
 * 설정 화면 한 묶음: 회색 제목 + 행들을 한 덩어리 카드로.
 * M5 의 백업·복원·카테고리도 이 섹션을 하나씩 늘려 넣는다.
 */
export function SettingsSection({ title, children }: Props) {
  const { colors, type, sp, radius } = useTheme();
  return (
    <View>
      <Text
        style={[type.label, { color: colors.textMuted, paddingTop: sp.md, paddingBottom: sp.sm }]}>
        {title}
      </Text>
      <View style={[styles.group, { borderRadius: radius.md, backgroundColor: colors.card }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { overflow: 'hidden' },
});
