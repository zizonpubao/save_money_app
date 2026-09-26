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
      {/* 목록 섹션 헤더(EntrySectionHeader)와 같은 자리: 좌우 sp.md 들여 아래 행 글자와 세로 줄을 맞춘다 */}
      <Text
        style={[
          type.label,
          { color: colors.textMuted, paddingTop: sp.md, paddingBottom: sp.sm, paddingHorizontal: sp.md },
        ]}>
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
