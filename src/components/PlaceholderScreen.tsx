import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/src/components/Screen';
import { useTheme } from '@/src/theme';

type Props = { title: string; subtitle?: string };

/** M1 단계용 자리표시 화면. 이후 단계에서 실제 화면으로 교체된다. */
export function PlaceholderScreen({ title, subtitle }: Props) {
  const { colors, fs, sp } = useTheme();
  return (
    <Screen style={styles.center}>
      <Text style={[styles.title, { color: colors.text, fontSize: fs.xl }]}>{title}</Text>
      {subtitle ? (
        <Text style={{ color: colors.textMuted, fontSize: fs.sm, marginTop: sp.sm }}>{subtitle}</Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700' },
});
