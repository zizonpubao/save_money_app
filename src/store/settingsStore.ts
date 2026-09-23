import { create } from 'zustand';

import { deleteSetting, getSetting, setSetting, SETTING_KEYS } from '@/src/db';
import { isValidGoal, parseGoal } from '@/src/features/goal';

type SettingsState = {
  /** 월 목표 금액(원). 없으면 null */
  monthlyGoal: number | null;
  loaded: boolean;
  load: () => void;
  /** 목표를 저장한다. 1원 이상 정수가 아니면 던진다 (화면이 저장 버튼으로 먼저 막는다). */
  setGoal: (goal: number) => void;
  clearGoal: () => void;
};

/**
 * 앱 설정 전역 상태. 설정 탭에서 바꾸면 홈 카드가 같은 값을 바로 읽는다.
 * 목표를 정하거나 바꾸거나 없애면 goal_reached_month 를 지운다 — 새 목표로 이번 달에 다시 축하받을 수 있게.
 * 이미 넘긴 금액보다 낮은 목표로 바꾸면 "이전 합계 < 목표" 가 아니라서 이펙트 없이 초과 문구만 뜬다.
 */
export const useSettingsStore = create<SettingsState>((set) => ({
  monthlyGoal: null,
  loaded: false,

  load: () => {
    set({ monthlyGoal: parseGoal(getSetting(SETTING_KEYS.monthlyGoal)), loaded: true });
  },

  setGoal: (goal) => {
    if (!isValidGoal(goal)) {
      throw new Error('목표는 1원 이상의 정수여야 합니다');
    }
    setSetting(SETTING_KEYS.monthlyGoal, String(goal));
    deleteSetting(SETTING_KEYS.goalReachedMonth);
    set({ monthlyGoal: goal, loaded: true });
  },

  clearGoal: () => {
    deleteSetting(SETTING_KEYS.monthlyGoal);
    deleteSetting(SETTING_KEYS.goalReachedMonth);
    set({ monthlyGoal: null, loaded: true });
  },
}));
