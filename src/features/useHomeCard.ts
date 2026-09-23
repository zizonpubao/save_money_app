import { useIsFocused } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';

import { useEntryStore } from '@/src/store/entryStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { thisMonth, today } from '@/src/utils/date';

import { dailyLine } from './dailyLine';
import { buildGrassCells } from './grass';

/**
 * (M3.6) 홈 카드의 활기 요소: 오늘의 한 줄, 이번 달 잔디, 이모지 적립 줄, 하루 첫 오픈 카운트업.
 * 데이터는 entryStore 스냅숏(저장·수정·삭제·포커스 때 다시 읽음)에서 가져오고,
 * 문구와 잔디는 입력이 바뀔 때만 다시 계산한다. 홈을 보고 있는 채로 앱이 앞으로 돌아오면(active) 첫 오픈 판정을 다시 한다.
 */
export function useHomeCard() {
  const todayTotal = useEntryStore((s) => s.todayTotal);
  const monthTotal = useEntryStore((s) => s.monthTotal);
  const yesterdayTotal = useEntryStore((s) => s.yesterdayTotal);
  const dailyTotals = useEntryStore((s) => s.dailyTotals);
  const monthEmojis = useEntryStore((s) => s.monthEmojis);
  const loaded = useEntryStore((s) => s.loaded);
  const firstOpenTick = useEntryStore((s) => s.firstOpenTick);
  const openHome = useEntryStore((s) => s.openHome);
  const goal = useSettingsStore((s) => s.monthlyGoal);
  const focused = useIsFocused();
  const focusedRef = useRef(focused);
  useEffect(() => {
    focusedRef.current = focused;
  }, [focused]);

  // 앱을 백그라운드에 둔 채 자정을 넘기면 탭 포커스가 다시 오지 않는다.
  // 앞으로 돌아올 때도 첫 오픈을 판정한다 (같은 날이면 last_open_date 비교로 아무 일도 없음).
  // 다른 탭에 있을 때는 건너뛴다. 뒤에서 판정하면 카운트업이 안 보이는 채로 끝나고,
  // 나중에 홈 탭으로 오면 포커스 효과가 첫 오픈을 판정한다
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && focusedRef.current) openHome();
    });
    return () => sub.remove();
  }, [openHome]);

  // 날짜는 렌더마다 문자열로 비교만 한다 → 자정을 넘긴 뒤 다시 그려지면 새 날 시드로 바뀐다
  const date = today();
  const month = thisMonth();

  const line = useMemo(
    () => dailyLine({ todayTotal, yesterdayTotal, monthTotal, goal, date }),
    [todayTotal, yesterdayTotal, monthTotal, goal, date],
  );
  const grass = useMemo(
    () => buildGrassCells(month, dailyTotals, date),
    [month, dailyTotals, date],
  );

  return { line, grass, monthEmojis, loaded, firstOpenTick };
}

