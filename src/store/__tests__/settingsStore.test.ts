import {
  getSetting,
  initDatabase,
  resetDatabaseConnection,
  setSetting,
  SETTING_KEYS,
} from '@/src/db';
import { useSettingsStore } from '@/src/store/settingsStore';

describe('settingsStore', () => {
  beforeEach(() => {
    resetDatabaseConnection();
    initDatabase();
    useSettingsStore.setState({ monthlyGoal: null, loaded: false });
  });

  afterAll(() => {
    resetDatabaseConnection();
  });

  it('load 는 DB 의 목표를 숫자로 읽는다', () => {
    setSetting(SETTING_KEYS.monthlyGoal, '300000');
    useSettingsStore.getState().load();
    expect(useSettingsStore.getState()).toMatchObject({ monthlyGoal: 300000, loaded: true });
  });

  it('목표가 없으면 load 후 null', () => {
    useSettingsStore.getState().load();
    expect(useSettingsStore.getState()).toMatchObject({ monthlyGoal: null, loaded: true });
  });

  it('DB 값이 망가져 있으면(숫자 아님) 목표 없음으로 본다', () => {
    setSetting(SETTING_KEYS.monthlyGoal, 'abc');
    useSettingsStore.getState().load();
    expect(useSettingsStore.getState().monthlyGoal).toBeNull();
  });

  it('setGoal 은 스토어와 DB 를 함께 바꾼다', () => {
    useSettingsStore.getState().setGoal(200000);
    expect(useSettingsStore.getState().monthlyGoal).toBe(200000);
    expect(getSetting(SETTING_KEYS.monthlyGoal)).toBe('200000');
  });

  it('setGoal 에 0·음수·소수를 넣으면 던지고 아무것도 바꾸지 않는다', () => {
    useSettingsStore.getState().setGoal(100000);
    expect(() => useSettingsStore.getState().setGoal(0)).toThrow();
    expect(() => useSettingsStore.getState().setGoal(-1)).toThrow();
    expect(() => useSettingsStore.getState().setGoal(1.5)).toThrow();
    expect(useSettingsStore.getState().monthlyGoal).toBe(100000);
    expect(getSetting(SETTING_KEYS.monthlyGoal)).toBe('100000');
  });

  it('clearGoal 은 스토어와 DB 에서 목표를 지운다', () => {
    useSettingsStore.getState().setGoal(300000);
    useSettingsStore.getState().clearGoal();
    expect(useSettingsStore.getState().monthlyGoal).toBeNull();
    expect(getSetting(SETTING_KEYS.monthlyGoal)).toBeNull();
  });

  it('목표를 정하거나 바꾸면 이번 달 축하 기록(goal_reached_month)을 지운다', () => {
    setSetting(SETTING_KEYS.goalReachedMonth, '2026-09');
    useSettingsStore.getState().setGoal(500000);
    expect(getSetting(SETTING_KEYS.goalReachedMonth)).toBeNull();
  });

  it('목표를 없애도 이번 달 축하 기록을 지운다', () => {
    useSettingsStore.getState().setGoal(300000);
    setSetting(SETTING_KEYS.goalReachedMonth, '2026-09');
    useSettingsStore.getState().clearGoal();
    expect(getSetting(SETTING_KEYS.goalReachedMonth)).toBeNull();
  });
});
