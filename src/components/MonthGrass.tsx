import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import type { GrassCell, GrassLevel, GrassMonth } from '@/src/features/grass';
import { useTheme, type ColorTokens } from '@/src/theme';

/** 일요일 시작 7열 */
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;
const COLUMNS = WEEKDAYS.length;

type Props = {
  grass: GrassMonth;
};

function levelColor(colors: ColorTokens, level: GrassLevel): string {
  switch (level) {
    case 1:
      return colors.grass1;
    case 2:
      return colors.grass2;
    case 3:
      return colors.grass3;
    case 4:
      return colors.grass4;
    default:
      return colors.divider;
  }
}

/**
 * 이번 달 잔디: 7열 달력(일~토). 1일은 그 요일 칸에서 시작한다.
 * 기록 있는 날은 그달 최댓값 대비 4단계 농도, 기록 없는 날은 divider, 아직 오지 않은 날은 더 연한 grassFuture,
 * 오늘은 primary 테두리. 보기만 하고 탭 반응은 없다.
 * 칸은 폭을 7등분한 너비 × size.grassCell 높이의 낮은 직사각형 — 6줄 달이어도 목록을 밀어내지 않게.
 * 제목 없이 요일 헤더만 둔다. 바탕(card 구획)은 쓰는 쪽이 깐다.
 * 레이아웃을 재기 전에는 칸 너비를 모르므로 칸을 그리지 않는다.
 */
export function MonthGrass({ grass }: Props) {
  const { colors, type, sp, radius, size } = useTheme();
  const [width, setWidth] = useState(0);
  const gap = sp.xs;
  const cellWidth = width > 0 ? Math.floor((width - gap * (COLUMNS - 1)) / COLUMNS) : 0;
  const cellHeight = size.grassCell;
  // 7등분을 내림한 나머지(최대 6px)가 한쪽에 몰리지 않게 격자를 가운데에 둔다
  const gridWidth = cellWidth * COLUMNS + gap * (COLUMNS - 1);
  const recordedDays = grass.cells.filter((c) => c.level > 0).length;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const cellStyle = (cell: GrassCell) => [
    {
      width: cellWidth,
      height: cellHeight,
      borderRadius: radius.xs,
      backgroundColor: cell.isFuture ? colors.grassFuture : levelColor(colors, cell.level),
    },
    cell.isToday && { borderWidth: size.todayRing, borderColor: colors.primary },
  ];

  return (
    <View
      testID="month-grass"
      onLayout={onLayout}
      accessible
      accessibilityLabel={`이번 달 기록한 날 ${recordedDays}일`}>
      {cellWidth > 0 ? (
        <View testID="month-grass-grid" style={[styles.center, { width: gridWidth }]}>
          <View style={[styles.row, { gap, marginBottom: sp.xs }]}>
            {WEEKDAYS.map((d) => (
              <Text
                key={d}
                style={[type.caption, styles.weekday, { width: cellWidth, color: colors.textMuted }]}>
                {d}
              </Text>
            ))}
          </View>
          <View style={[styles.grid, { gap }]}>
            {Array.from({ length: grass.leadingBlanks }, (_, i) => (
              <View key={`blank-${i}`} style={{ width: cellWidth, height: cellHeight }} />
            ))}
            {grass.cells.map((cell) => (
              <View key={cell.date} testID={`grass-${cell.date}`} style={cellStyle(cell)} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { textAlign: 'center' },
  center: { alignSelf: 'center' },
});
