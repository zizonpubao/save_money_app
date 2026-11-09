import { forwardRef } from 'react';
import { Image, StyleSheet, Text, View, type ViewInstance } from 'react-native';

import type { ShareCardData } from '@/src/features/shareCard';
import { brandColors, numeric, radius, size, sp, typeScale } from '@/src/theme';
import { fitFontSize } from '@/src/utils/fitText';

const PIG = require('@/assets/images/android-icon-foreground.png') as number;

/** 카드 안쪽 폭. 금액 줄임 계산에 쓴다 */
const INNER_WIDTH = size.shareCardWidth - sp.lg * 2;
/** 큰 합계도 한 줄에 들어가게 기본 줄임(0.6배)보다 더 줄인다 */
const AMOUNT_MIN_SCALE = 0.4;

/**
 * 공유용 4:5 카드. 앱 테마와 상관없이 항상 브랜드 색이다.
 * collapsable={false}: Android 가 뷰를 합쳐 없애면 캡처할 대상이 사라진다.
 */
export const ShareCard = forwardRef<ViewInstance, { data: ShareCardData }>(function ShareCard({ data }, ref) {
  const fontSize = fitFontSize(data.amountText, INNER_WIDTH, typeScale.shareAmount.fontSize, AMOUNT_MIN_SCALE);
  return (
    <View ref={ref} testID="share-card" collapsable={false} style={styles.card}>
      <Text style={[typeScale.heading, styles.text]}>{data.periodLabel}</Text>
      <Text numberOfLines={1} style={[typeScale.shareAmount, numeric, styles.text, styles.amount, { fontSize }]}>
        {data.amountText}
      </Text>
      <Text style={[typeScale.heading, styles.text]}>아꼈어요</Text>
      <View style={styles.statsRow}>
        <Text style={[typeScale.label, numeric, styles.text]}>{data.countText}</Text>
        {data.topCategoryText ? (
          <View style={styles.topChip}>
            <Text numberOfLines={1} style={[typeScale.label, styles.topChipText]}>
              {data.topCategoryText}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.footer}>
        <View style={styles.pigBox}>
          <Image source={PIG} fadeDuration={0} style={styles.pig} accessibilityIgnoresInvertColors />
        </View>
        <Text style={[typeScale.bodyStrong, styles.text]}>SaveLog</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: size.shareCardWidth,
    height: size.shareCardHeight,
    padding: sp.lg,
    backgroundColor: brandColors.bg,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  text: { color: brandColors.text },
  amount: { marginTop: sp.sm },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, marginTop: sp.md },
  // 주황은 글자색으로 쓰지 않고 면으로만 쓴다
  topChip: {
    flexShrink: 1,
    backgroundColor: brandColors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: sp.smd,
    paddingVertical: sp.xs,
  },
  topChipText: { color: brandColors.onAccent },
  footer: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  pigBox: {
    width: size.shareCardPig,
    height: size.shareCardPigBox,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pig: { width: size.shareCardPig, height: size.shareCardPig },
});
