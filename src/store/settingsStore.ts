import { create } from 'zustand';

import { deleteSetting, getSetting, setSetting, SETTING_KEYS } from '@/src/db';
import { isValidGoal, parseGoal } from '@/src/features/goal';
import { setHapticsEnabled } from '@/src/utils/haptics';

type SettingsState = {
  /** 월 목표 금액(원). 없으면 null */
  monthlyGoal: number | null;
  /** (M4) 저장 효과음. 기본 켬 */
  soundEnabled: boolean;
  /** (M4) 앱 전체 햅틱. 기본 켬 */
  hapticsEnabled: boolean;
  loaded: boolean;
  load: () => void;
  /** 목표를 저장한다. 1원 이상 정수가 아니면 던진다 (화면이 저장 버튼으로 먼저 막는다). */
  setGoal: (goal: number) => void;
  clearGoal: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
};

/** 켬/끔 설정 값. '0' 만 끔이고, 없거나 다른 값이면 기본값(켬)으로 본다 */
export function parseFlag(value: string | null): boolean {
  return value !== '0';
}

function flagValue(enabled: boolean): string {
  return enabled ? '1' : '0';
}

/**
 * 앱 설정 전역 상태. 설정 탭에서 바꾸면 홈 카드가 같은 값을 바로 읽는다.
 * 목표를 정하거나 바꾸거나 없애면 goal_reached_month 를 지운다 — 새 목표로 이번 달에 다시 축하받을 수 있게.
 * 이미 넘긴 금액보다 낮은 목표로 바꾸면 "이전 합계 < 목표" 가 아니라서 이펙트 없이 초과 문구만 뜬다.
 * 햅틱 스위치는 utils/haptics 에도 넣어 준다 — 모든 햅틱이 그 한 곳에서 켬/끔을 검사한다.
 */
export const useSettingsStore = create<SettingsState>((set) => ({
  monthlyGoal: null,
  soundEnabled: true,
  hapticsEnabled: true,
  loaded: false,

  load: () => {
    const hapticsEnabled = parseFlag(getSetting(SETTING_KEYS.hapticsEnabled));
    setHapticsEnabled(hapticsEnabled);
    set({
      monthlyGoal: parseGoal(getSetting(SETTING_KEYS.monthlyGoal)),
      soundEnabled: parseFlag(getSetting(SETTING_KEYS.soundEnabled)),
      hapticsEnabled,
      loaded: true,
    });
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

  setSoundEnabled: (enabled) => {
    setSetting(SETTING_KEYS.soundEnabled, flagValue(enabled));
    set({ soundEnabled: enabled });
  },

  setHapticsEnabled: (enabled) => {
    setSetting(SETTING_KEYS.hapticsEnabled, flagValue(enabled));
    setHapticsEnabled(enabled);
    set({ hapticsEnabled: enabled });
  },
}));
