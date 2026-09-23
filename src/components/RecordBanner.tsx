import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { personalBestMessage, type PersonalBest } from '@/src/features/personalBest';
import { useTheme } from '@/src/theme';

/** 축하 문구를 띄워 두는 시간 (ms) */
const SHOW_MS = 1500;

type Props = {
  best: PersonalBest;
  /** 저장 횟수. 이 값이 바뀔 때마다 다시 띄운다. */
  celebrateTick: number;
};

/** 저장 직후 개인 최고를 갱신했을 때만 카드 아래에 한 줄. 1.5초 뒤 사라진다. */
export function RecordBanner({ best, celebrateTick }: Props) {
  const { colors, type, sp, radius } = useTheme();
  // 이미 지나간(숨긴) 저장 횟수. 새 저장이 오면 tick 이 더 커져서 다시 보인다.
  // 마운트 시점의 tick 으로 시작해, 탭을 다시 열었다고 지난 문구가 되살아나지 않게 한다.
  const [dismissed, setDismissed] = useState(celebrateTick);

  useEffect(() => {
    if (celebrateTick === 0) return;
    const timer = setTimeout(() => setDismissed(celebrateTick), SHOW_MS);
    return () => clearTimeout(timer);
  }, [celebrateTick]);

  const message = celebrateTick > dismissed ? personalBestMessage(best) : null;
  if (!message) return null;

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: sp.smd },
      ]}>
      <Text style={[type.label, { color: colors.primary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { alignItems: 'center' },
});
