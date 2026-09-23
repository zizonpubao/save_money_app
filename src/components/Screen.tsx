import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/src/theme';

type Props = PropsWithChildren<{ style?: ViewStyle }>;

/** 탭 화면 공통 바탕. 배경색 + 기본 패딩. */
export function Screen({ children, style }: Props) {
  const { colors, sp } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.bg, padding: sp.md }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
