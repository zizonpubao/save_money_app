import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ChartBar } from '@/src/features/monthlyStats';
import { numeric, useTheme } from '@/src/theme';
import { formatWon } from '@/src/utils/money';

type Props = {
  /** 일별(1일~말일) 또는 월별(1~12월) 칸. 축 라벨은 칸마다 axisLabel 로 정해져 온다. */
  bars: ChartBar[];
};

/**
 * 막대 그래프. 외부 차트 라이브러리 없이 View 로만 그린다.
 * 높이 = 그 칸 합계 / 최댓값, 최고값 막대만 primary. 막대를 탭하면 "23일 · 12,000원" / "9월 · 184,000원" 툴팁이 뜬다.
 * 기간·모드가 바뀌면 부모가 key 로 새로 마운트해 선택(툴팁)을 비운다.
 */
export function BarChart({ bars }: Props) {
  const { colors, type, sp, size } = useTheme();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = bars.find((bar) => bar.key === selectedKey) ?? null;

  const lastIndex = bars.length - 1;
  const barHeight = (bar: ChartBar) =>
    bar.total > 0 ? Math.max(size.barMin, Math.round(bar.ratio * size.barTrack)) : 0;

  return (
    // 차트 영역(툴팁 줄·막대 사이·축) 어디를 탭해도 툴팁이 닫힌다. 막대 칸 탭은 안쪽 Pressable 이 먼저 받는다.
    <Pressable onPress={() => setSelectedKey(null)}>
      {/* 툴팁 자리는 항상 비워 둬서 탭할 때 그래프가 밀리지 않게 한다 */}
      <View style={[styles.tooltip, { height: type.note.lineHeight, marginBottom: sp.sm }]}>
        {selected ? (
          <Text style={[type.note, numeric, { color: colors.text }]}>
            {selected.label} · {formatWon(selected.total)}
          </Text>
        ) : null}
      </View>

      {/* 칸 전체(폭 1/칸 수 × 트랙 높이)가 탭 영역. 막대는 칸 안에서 70% 폭으로 그려 사이 여백을 만든다 */}
      <View style={[styles.row, { height: size.barTrack }]}>
        {bars.map((bar) => (
          <Pressable
            key={bar.key}
            onPress={() => setSelectedKey((prev) => (prev === bar.key ? null : bar.key))}
            accessibilityRole="button"
            accessibilityLabel={`${bar.label} ${formatWon(bar.total)}`}
            style={styles.column}>
            <View
              style={[
                styles.bar,
                {
                  height: barHeight(bar),
                  backgroundColor: bar.isMax ? colors.primary : colors.primarySoft,
                },
              ]}
            />
          </Pressable>
        ))}
      </View>

      {/* 막대와 똑같은 flex 칸을 써서 라벨이 자기 칸 기준으로 붙게 한다 */}
      <View style={[styles.row, { height: type.caption.lineHeight }]}>
        {bars.map((bar, index) => (
          <View key={bar.key} style={styles.axisSlot}>
            {bar.axisLabel !== null ? (
              // 칸보다 넓을 수 있는 고정 폭 라벨을 absolute 로 띄워 잘리지 않게 한다.
              // 보통은 칸 가운데, 첫 칸은 왼쪽 끝, 마지막 칸은 오른쪽 끝에 붙여 그래프 폭을 넘지 않게 한다.
              <Text
                numberOfLines={1}
                style={[
                  styles.axisLabel,
                  { width: size.axisLabel },
                  index === 0
                    ? styles.axisLabelStart
                    : index === lastIndex
                      ? styles.axisLabelEnd
                      : styles.axisLabelCenter,
                  type.caption,
                  numeric,
                  { color: colors.textMuted },
                ]}>
                {bar.axisLabel}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tooltip: { alignItems: 'center', justifyContent: 'center' },
  /** 막대는 바닥에서 자란다 */
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  column: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '70%' },
  /** absolute 라벨은 inset 없이 두면 부모 alignItems 기준으로 놓인다 → 칸 가운데 */
  axisSlot: { flex: 1, height: '100%', alignItems: 'center' },
  axisLabel: { position: 'absolute', top: 0 },
  axisLabelCenter: { textAlign: 'center' },
  /** 첫 칸은 칸 왼쪽 끝(=그래프 왼쪽 끝)에 붙인다 */
  axisLabelStart: { left: 0, textAlign: 'left' },
  /** 마지막 칸은 칸 오른쪽 끝(=그래프 오른쪽 끝)에 붙인다 */
  axisLabelEnd: { right: 0, textAlign: 'right' },
});
