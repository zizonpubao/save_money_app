import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { ChartBar } from '@/src/features/monthlyStats';
import { numeric, useTheme } from '@/src/theme';
import { scrubTick } from '@/src/utils/haptics';
import { formatWon } from '@/src/utils/money';

type Props = {
  /** 일별(1일~말일) 또는 월별(1~12월) 칸. 축 라벨은 칸마다 axisLabel 로 정해져 온다. */
  bars: ChartBar[];
};

/**
 * 가로로 이만큼(pt) 움직여야 쓸기가 시작된다. 작게 잡아 거의 즉시 반응하게 한다.
 * minDistance(0) 은 쓰지 않는다 — iOS 에서는 조건 중 하나만 맞아도 활성화돼서, 세로로 1pt 만 움직여도
 * 쓸기가 먼저 잡혀 목록 스크롤을 막아 버린다.
 */
const SCRUB_ACTIVE_X = 3;
/** 가로보다 세로로 먼저 이만큼 움직이면 쓸기를 포기하고 목록 세로 스크롤에 양보한다 */
const SCRUB_FAIL_Y = 8;
/** 단순 탭으로 인정하는 최대 이동 거리. 스크롤하려다 뗀 손가락이 탭으로 잡히지 않게 한다 */
const TAP_MAX_DIST = 10;

/**
 * 손가락 x 좌표 → 칸 번호(0 ~ count-1). 칸은 폭이 모두 같다(flex: 1).
 * 차트 밖으로 끌고 나가도 양 끝 칸에 머물도록 자른다. 폭을 아직 모르면 -1.
 * 제스처 콜백(UI 스레드)에서 매 프레임 부르므로 worklet 으로 둔다.
 */
export function indexAtX(x: number, width: number, count: number): number {
  'worklet';
  if (width <= 0 || count <= 0) return -1;
  const index = Math.floor(x / (width / count));
  return Math.min(count - 1, Math.max(0, index));
}

/**
 * 막대 그래프. 외부 차트 라이브러리 없이 View 로만 그린다.
 * 높이 = 그 칸 합계 / 최댓값, 최고값 막대와 선택된 막대가 primary.
 * 조작: 막대를 탭하거나 누른 채 좌우로 쓸면 "23일 · 12,000원" / "9월 · 184,000원" 툴팁이 뜨고,
 * 쓰는 중 칸이 바뀔 때마다 selection 햅틱. 손을 떼도 툴팁은 남고, 같은 막대 재탭·차트의 막대 밖 탭이면 닫힌다.
 * 기간·모드가 바뀌면 부모가 key 로 새로 마운트해 선택(툴팁)을 비운다.
 */
export function BarChart({ bars }: Props) {
  const { colors, type, sp, size } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  // 칸 31개를 손가락으로 정확히 탭하기 어려워서 제스처 하나로 전체를 받는다 → 좌표로 칸을 계산하려면 크기가 필요하다
  const [width, setWidth] = useState(0);
  const [track, setTrack] = useState({ top: 0, bottom: 0 });
  /** 마지막으로 알린 칸. 같은 칸 안에서 움직일 때는 JS 로 넘어가지 않게(햅틱·렌더 반복 방지) UI 스레드에서 비교한다 */
  const lastIndex = useSharedValue(-1);

  const count = bars.length;
  const selected = selectedIndex !== null ? (bars[selectedIndex] ?? null) : null;
  const lastBar = count - 1;

  const scrubTo = useCallback((index: number) => {
    setSelectedIndex(index);
    scrubTick();
  }, []);
  const toggleAt = useCallback((index: number) => {
    setSelectedIndex((prev) => (prev === index ? null : index));
  }, []);
  const clear = useCallback(() => setSelectedIndex(null), []);

  // Android 뒤로 가기: 툴팁이 떠 있으면 화면을 떠나지 않고 툴팁만 닫는다 (iOS 는 오지 않음)
  const tooltipOpen = selectedIndex !== null;
  useEffect(() => {
    if (!tooltipOpen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedIndex(null);
      return true;
    });
    return () => sub.remove();
  }, [tooltipOpen]);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activeOffsetX([-SCRUB_ACTIVE_X, SCRUB_ACTIVE_X])
      .failOffsetY([-SCRUB_FAIL_Y, SCRUB_FAIL_Y])
      .onStart((e) => {
        const index = indexAtX(e.x, width, count);
        if (index < 0) return;
        lastIndex.set(index);
        scheduleOnRN(scrubTo, index);
      })
      .onUpdate((e) => {
        const index = indexAtX(e.x, width, count);
        if (index < 0 || index === lastIndex.get()) return;
        lastIndex.set(index);
        scheduleOnRN(scrubTo, index);
      })
      .onFinalize(() => {
        lastIndex.set(-1);
      })
      .withTestId('barchart-pan');

    // 막대 줄 안 탭은 그 칸 선택(같은 칸이면 닫기), 툴팁 줄·축 라벨 줄 탭은 닫기
    const tap = Gesture.Tap()
      .maxDistance(TAP_MAX_DIST)
      .onEnd((e, success) => {
        if (!success) return;
        const index = e.y >= track.top && e.y <= track.bottom ? indexAtX(e.x, width, count) : -1;
        if (index < 0) {
          scheduleOnRN(clear);
        } else {
          scheduleOnRN(toggleAt, index);
        }
      })
      .withTestId('barchart-tap');

    // 좌우로 3pt 움직이면 쓸기가 이기고 탭은 취소, 움직이지 않고 떼면 탭이 이긴다
    return Gesture.Race(pan, tap);
  }, [width, track, count, lastIndex, scrubTo, toggleAt, clear]);

  const onChartLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const onTrackLayout = (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    setTrack({ top: y, bottom: y + height });
  };

  // 칸별 버튼이 없어졌으니 VoiceOver 는 막대 줄 하나를 "조정 가능" 요소로 두고 위아래 쓸기로 칸을 옮긴다
  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const step = e.nativeEvent.actionName === 'increment' ? 1 : -1;
    setSelectedIndex((prev) => Math.min(lastBar, Math.max(0, (prev ?? (step > 0 ? -1 : count)) + step)));
  };

  const barHeight = (bar: ChartBar, isSelected: boolean) => {
    if (bar.total > 0) return Math.max(size.barMin, Math.round(bar.ratio * size.barTrack));
    // 기록 없는 칸도 선택되면 바닥에 얇게 그려 손가락이 어느 칸에 있는지 보이게 한다
    return isSelected ? size.barMin : 0;
  };

  return (
    <GestureDetector gesture={gesture}>
      <View testID="barchart" onLayout={onChartLayout} collapsable={false}>
        {/* 툴팁 자리는 항상 비워 둬서 탭할 때 그래프가 밀리지 않게 한다 */}
        <View style={[styles.tooltip, { height: type.note.lineHeight, marginBottom: sp.sm }]}>
          {selected ? (
            <Text style={[type.note, numeric, { color: colors.text }]}>
              {selected.label} · {formatWon(selected.total)}
            </Text>
          ) : null}
        </View>

        {/* 칸은 균등 폭(flex: 1)이라 x 좌표만으로 칸을 알 수 있다. 막대는 칸 안에서 70% 폭으로 그려 사이 여백을 만든다 */}
        <View
          testID="barchart-track"
          onLayout={onTrackLayout}
          style={[styles.row, { height: size.barTrack }]}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="막대 그래프"
          accessibilityHint="위아래로 쓸어 날짜 이동"
          accessibilityValue={{
            text: selected ? `${selected.label} ${formatWon(selected.total)}` : '선택 없음',
          }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={onAccessibilityAction}>
          {bars.map((bar, index) => {
            const isSelected = index === selectedIndex;
            return (
              <View key={bar.key} testID={`bar-${bar.key}`} style={styles.column}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight(bar, isSelected),
                      // 선택이 우선, 그다음 최고값
                      backgroundColor: isSelected || bar.isMax ? colors.primary : colors.primarySoft,
                    },
                  ]}
                />
              </View>
            );
          })}
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
                      : index === lastBar
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
      </View>
    </GestureDetector>
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
