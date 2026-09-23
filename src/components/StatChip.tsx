import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { numeric, useTheme } from '@/src/theme';

type Props = {
  /** 글자면 label + numeric 로 그리고, 그 밖(이모지 적립 줄 등)은 그대로 넣는다 */
  children: ReactNode;
  /** 줄에 남는 폭을 모두 차지한다 (이모지 적립 줄처럼 길이가 변하는 칩) */
  grow?: boolean;
  testID?: string;
};

/**
 * 홈 카드 아래 칩 행의 정보 칩. 보기 전용이라 선택 칩(테두리 1px)과 달리 테두리 없이 card 바탕 + pill.
 * 높이는 size.statChip 으로 모두 같게 맞춘다. (M4) 연속 기록일 "🔥 5일째"·누적 "누적 432,000원" 도 이 칩을 쓴다.
 */
export function StatChip({ children, grow = false, testID }: Props) {
  const { colors, type, sp, radius, size } = useTheme();
  return (
    <View
      testID={testID}
      style={[
        styles.chip,
        grow && styles.grow,
        {
          backgroundColor: colors.card,
          borderRadius: radius.pill,
          minHeight: size.statChip,
          paddingHorizontal: sp.smd,
        },
      ]}>
      {typeof children === 'string' ? (
        <Text numberOfLines={1} style={[type.label, numeric, { color: colors.text }]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { justifyContent: 'center' },
  // minWidth 0: 옆 칩이 늘어나면 이 칩이 줄어들 수 있게 (안의 이모지 줄은 "+N" 으로 접힌다)
  grow: { flex: 1, minWidth: 0 },
});
