import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { DailyLine } from '@/src/components/DailyLine';
import { EmojiStrip, hiddenLabel, visibleEmojis } from '@/src/components/EmojiStrip';
import { MonthGrass } from '@/src/components/MonthGrass';
import type { EntryEmoji } from '@/src/db';
import { buildGrassCells } from '@/src/features/grass';
import { lightColors, radius, size, sp, typeScale } from '@/src/theme';

const emojis = (list: string[], startId = 1): EntryEmoji[] =>
  list.map((emoji, i) => ({ id: startId + i, emoji }));

describe('DailyLine', () => {
  it('문구를 그대로 보여주고, 바뀌면 새 문구로 바뀐다', async () => {
    const { rerender } = await render(<DailyLine text="어제보다 +4,500원" />);
    expect(screen.getByText('어제보다 +4,500원')).toBeOnTheScreen();
    await rerender(<DailyLine text="= 치킨 3마리 🍗" />);
    expect(screen.getByText('= 치킨 3마리 🍗')).toBeOnTheScreen();
    expect(screen.queryByText('어제보다 +4,500원')).toBeNull();
  });

  it('읽히게 본문 크기(body 16), 큰 숫자와 겨루지 않게 textMuted 색이다', async () => {
    await render(<DailyLine text="어제와 같아요" />);
    expect(StyleSheet.flatten(screen.getByTestId('daily-line').props.style)).toMatchObject({
      fontSize: typeScale.body.fontSize,
      color: lightColors.textMuted,
    });
  });

  it('2줄까지만 보여 주고 넘치면 끝을 말줄임', async () => {
    await render(<DailyLine text="어제와 같아요" />);
    const line = screen.getByTestId('daily-line');
    expect(line.props.numberOfLines).toBe(2);
    expect(line.props.ellipsizeMode).toBe('tail');
  });
});

describe('EmojiStrip', () => {
  it('기록이 없으면 아무것도 그리지 않는다', async () => {
    await render(<EmojiStrip items={[]} celebrateTick={0} />);
    expect(screen.queryByTestId('emoji-strip')).toBeNull();
  });

  it('등록 순서대로 이모지를 나열한다', async () => {
    await render(<EmojiStrip items={emojis(['☕', '☕', '🍗', '📦'])} celebrateTick={0} />);
    expect(screen.getAllByText(/☕|🍗|📦/).map((t) => t.props.children)).toEqual([
      '☕',
      '☕',
      '🍗',
      '📦',
    ]);
    expect(screen.getByLabelText('이번 달 기록 4개')).toBeOnTheScreen();
  });

  it('저장(celebrateTick 증가)으로 새로 생긴 이모지만 톡 튀어 들어온다', async () => {
    const before = emojis(['☕', '🍗']);
    const { rerender } = await render(<EmojiStrip items={before} celebrateTick={0} />);
    expect(screen.queryByTestId('emoji-pop')).toBeNull();
    await rerender(<EmojiStrip items={[...before, { id: 3, emoji: '🚕' }]} celebrateTick={1} />);
    expect(screen.getByTestId('emoji-pop')).toHaveTextContent('🚕');
  });

  it('처음 불러온 목록·수정·삭제는 애니메이션 없이 바뀐다', async () => {
    const { rerender } = await render(<EmojiStrip items={[]} celebrateTick={0} />);
    // 홈이 처음 DB 를 읽어 목록이 채워진 경우 (저장 아님)
    await rerender(<EmojiStrip items={emojis(['☕', '🍗'])} celebrateTick={0} />);
    expect(screen.queryByTestId('emoji-pop')).toBeNull();
    // 수정(카테고리 변경)
    await rerender(<EmojiStrip items={emojis(['☕', '🍺'])} celebrateTick={0} />);
    expect(screen.queryByTestId('emoji-pop')).toBeNull();
    // 삭제
    await rerender(<EmojiStrip items={emojis(['☕'])} celebrateTick={0} />);
    expect(screen.queryByTestId('emoji-pop')).toBeNull();
  });

  it('다른 달 날짜로 저장해 이번 달 목록이 그대로면 튀지 않는다', async () => {
    const items = emojis(['☕', '🍗']);
    const { rerender } = await render(<EmojiStrip items={items} celebrateTick={0} />);
    await rerender(<EmojiStrip items={[...items]} celebrateTick={1} />);
    expect(screen.queryByTestId('emoji-pop')).toBeNull();
  });

  it('3줄을 넘으면 오래된 것을 접어 맨 앞에 "+N", 방금 것은 끝에 남는다', async () => {
    // 한 줄 5칸이 되는 폭: 5 * cell + 4 * gap
    const width = 5 * size.emojiCell + 4 * sp.xs;
    const items = emojis(Array.from({ length: 20 }, () => '☕'));
    items[19] = { id: 20, emoji: '🚕' };
    await render(<EmojiStrip items={items} celebrateTick={0} />);
    await fireEvent(screen.getByTestId('emoji-strip'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 100 } },
    });
    // 15칸 = "+6" 한 칸 + 이모지 14개
    expect(screen.getByText('+6')).toBeOnTheScreen();
    expect(screen.getAllByText(/☕|🚕/)).toHaveLength(14);
    expect(screen.getByText('🚕')).toBeOnTheScreen();
  });

  it('"+N" 칸은 이모지 한 칸 폭에 한 줄, 999 를 넘으면 "999+"', async () => {
    expect(hiddenLabel(6)).toBe('+6');
    expect(hiddenLabel(999)).toBe('+999');
    expect(hiddenLabel(1000)).toBe('999+');
    const width = 5 * size.emojiCell + 4 * sp.xs;
    await render(<EmojiStrip items={emojis(Array.from({ length: 1020 }, () => '☕'))} celebrateTick={0} />);
    await fireEvent(screen.getByTestId('emoji-strip'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 100 } },
    });
    const more = screen.getByText('999+');
    expect(more.props.numberOfLines).toBe(1);
  });

  it('visibleEmojis: 딱 맞으면 접지 않고, 폭을 모르면 자르지 않는다', () => {
    const items = emojis(Array.from({ length: 15 }, () => '☕'));
    expect(visibleEmojis(items, 5).hidden).toBe(0);
    expect(visibleEmojis(items, 0).shown).toHaveLength(15);
    expect(visibleEmojis(emojis(Array.from({ length: 16 }, () => '☕')), 5)).toMatchObject({
      hidden: 2,
    });
    // 홈 칩 행은 1줄: 5칸 넘는 6개면 "+2" + 최근 4개
    expect(visibleEmojis(emojis(Array.from({ length: 6 }, () => '☕')), 5, 1)).toMatchObject({
      hidden: 2,
    });
  });
});

describe('MonthGrass', () => {
  /** 칸 너비 20 이 되도록: 7 * 20 + 6 * gap(4) = 164 */
  async function renderGrass(
    month: string,
    today: string,
    totals = [] as { date: string; total: number }[],
    width = 7 * 20 + 6 * sp.xs,
  ) {
    await render(<MonthGrass grass={buildGrassCells(month, totals, today)} />);
    await fireEvent(screen.getByTestId('month-grass'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 300 } },
    });
  }
  const styleOf = (date: string) => StyleSheet.flatten(screen.getByTestId(`grass-${date}`).props.style);

  it('요일 헤더 "일 월 화 수 목 금 토" 와 그달 날 수만큼 칸을 그린다', async () => {
    await renderGrass('2026-09', '2026-09-24');
    expect(['일', '월', '화', '수', '목', '금', '토'].map((d) => screen.getByText(d))).toHaveLength(7);
    expect(screen.getAllByTestId(/^grass-2026-09-/)).toHaveLength(30);
  });

  it('칸 너비는 폭을 7등분, 높이는 size.grassCell 로 낮게, radius.xs', async () => {
    await renderGrass('2026-09', '2026-09-24');
    expect(styleOf('2026-09-01')).toMatchObject({
      width: 20,
      height: size.grassCell,
      borderRadius: radius.xs,
    });
  });

  it('폭이 넓으면 칸이 옆으로만 늘고(높이 grassCell 16 고정), 내림 나머지는 격자 가운데 정렬로 나눈다', async () => {
    // (360 - 24) / 7 = 48 → 딱 나눠지지 않게 1 더한 폭
    await renderGrass('2026-09', '2026-09-24', [], 361);
    expect(size.grassCell).toBe(16);
    expect(styleOf('2026-09-01')).toMatchObject({ width: 48, height: 16 });
    expect(StyleSheet.flatten(screen.getByTestId('month-grass-grid').props.style)).toMatchObject({
      width: 7 * 48 + 6 * sp.xs,
      alignSelf: 'center',
    });
  });

  it('기록 없는 날 divider, 기록한 날 농도 색, 미래는 grassFuture, 오늘은 todayRing 테두리', async () => {
    await renderGrass('2026-09', '2026-09-24', [
      { date: '2026-09-02', total: 1000 },
      { date: '2026-09-03', total: 8000 },
    ]);
    expect(styleOf('2026-09-01').backgroundColor).toBe(lightColors.divider);
    expect(styleOf('2026-09-02').backgroundColor).toBe(lightColors.grass1);
    expect(styleOf('2026-09-03').backgroundColor).toBe(lightColors.grass4);
    expect(styleOf('2026-09-25').backgroundColor).toBe(lightColors.grassFuture);
    expect(styleOf('2026-09-24')).toMatchObject({
      borderWidth: size.todayRing,
      borderColor: lightColors.todayRing,
    });
    expect(styleOf('2026-09-23').borderWidth).toBeUndefined();
    expect(screen.getByLabelText('이번 달 기록한 날 2일')).toBeOnTheScreen();
  });

  it('레이아웃을 재기 전에는 칸을 그리지 않는다 (칸 크기를 모름)', async () => {
    await render(<MonthGrass grass={buildGrassCells('2026-09', [], '2026-09-24')} />);
    expect(screen.queryByTestId('grass-2026-09-01')).toBeNull();
  });
});
