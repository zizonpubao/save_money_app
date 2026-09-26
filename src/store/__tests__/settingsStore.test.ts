import {
  getSetting,
  initDatabase,
  resetDatabaseConnection,
  setSetting,
  SETTING_KEYS,
} from '@/src/db';
import { AMOUNT_PRESETS } from '@/src/features/amountPresets';
import { parseFlag, useSettingsStore } from '@/src/store/settingsStore';
import { isHapticsEnabled, setHapticsEnabled } from '@/src/utils/haptics';

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

describe('settingsStore — 효과음·햅틱 스위치 (M4)', () => {
  beforeEach(() => {
    resetDatabaseConnection();
    initDatabase();
    useSettingsStore.setState({ soundEnabled: true, hapticsEnabled: true, loaded: false });
    setHapticsEnabled(true);
  });

  afterAll(() => {
    resetDatabaseConnection();
    setHapticsEnabled(true);
  });

  it('키가 없으면(첫 설치) 둘 다 켬', () => {
    useSettingsStore.getState().load();
    expect(useSettingsStore.getState()).toMatchObject({ soundEnabled: true, hapticsEnabled: true });
  });

  it("DB 의 '0' 은 끔, '1' 은 켬으로 읽고 햅틱 값은 utils/haptics 에도 넣는다", () => {
    setSetting(SETTING_KEYS.soundEnabled, '0');
    setSetting(SETTING_KEYS.hapticsEnabled, '0');
    useSettingsStore.getState().load();
    expect(useSettingsStore.getState()).toMatchObject({ soundEnabled: false, hapticsEnabled: false });
    expect(isHapticsEnabled()).toBe(false);
  });

  it("끄고 켜면 DB 에 '0' / '1' 로 적는다", () => {
    useSettingsStore.getState().setSoundEnabled(false);
    useSettingsStore.getState().setHapticsEnabled(false);
    expect(getSetting(SETTING_KEYS.soundEnabled)).toBe('0');
    expect(getSetting(SETTING_KEYS.hapticsEnabled)).toBe('0');
    expect(isHapticsEnabled()).toBe(false);
    useSettingsStore.getState().setHapticsEnabled(true);
    expect(getSetting(SETTING_KEYS.hapticsEnabled)).toBe('1');
    expect(isHapticsEnabled()).toBe(true);
  });

  it('parseFlag: 없음·이상한 값은 켬, "0" 만 끔', () => {
    expect(parseFlag(null)).toBe(true);
    expect(parseFlag('1')).toBe(true);
    expect(parseFlag('yes')).toBe(true);
    expect(parseFlag('0')).toBe(false);
  });
});

describe('settingsStore — 빠른 금액 버튼 (amount_presets)', () => {
  beforeEach(() => {
    resetDatabaseConnection();
    initDatabase();
    useSettingsStore.setState({ amountPresets: [...AMOUNT_PRESETS], loaded: false });
  });

  afterAll(() => {
    resetDatabaseConnection();
  });

  it('키가 없으면 기본 5개', () => {
    useSettingsStore.getState().load();
    expect(useSettingsStore.getState().amountPresets).toEqual([500, 1000, 3000, 5000, 10000]);
  });

  it('DB 값이 망가져 있으면 기본값으로 읽는다', () => {
    setSetting(SETTING_KEYS.amountPresets, '[500,');
    useSettingsStore.getState().load();
    expect(useSettingsStore.getState().amountPresets).toEqual([...AMOUNT_PRESETS]);
  });

  it('setAmountPresets 는 순서 그대로 DB 에 JSON 으로 적고, 다시 load 해도 같다', () => {
    useSettingsStore.getState().setAmountPresets([10000, 100, 2500, 700, 1000000]);
    expect(useSettingsStore.getState().amountPresets).toEqual([10000, 100, 2500, 700, 1000000]);
    expect(getSetting(SETTING_KEYS.amountPresets)).toBe('[10000,100,2500,700,1000000]');
    useSettingsStore.setState({ amountPresets: [...AMOUNT_PRESETS] });
    useSettingsStore.getState().load();
    expect(useSettingsStore.getState().amountPresets).toEqual([10000, 100, 2500, 700, 1000000]);
  });

  it('규칙에 어긋나면 던지고 아무것도 바꾸지 않는다', () => {
    useSettingsStore.getState().setAmountPresets([100, 200, 300, 400, 500]);
    expect(() => useSettingsStore.getState().setAmountPresets([100, 200, 300, 400])).toThrow();
    expect(() => useSettingsStore.getState().setAmountPresets([150, 200, 300, 400, 500])).toThrow();
    expect(() => useSettingsStore.getState().setAmountPresets([100, 100, 300, 400, 500])).toThrow();
    expect(useSettingsStore.getState().amountPresets).toEqual([100, 200, 300, 400, 500]);
    expect(getSetting(SETTING_KEYS.amountPresets)).toBe('[100,200,300,400,500]');
  });

  it('resetAmountPresets 는 DB 키를 지우고 기본값으로 돌린다', () => {
    useSettingsStore.getState().setAmountPresets([100, 200, 300, 400, 500]);
    useSettingsStore.getState().resetAmountPresets();
    expect(useSettingsStore.getState().amountPresets).toEqual([...AMOUNT_PRESETS]);
    expect(getSetting(SETTING_KEYS.amountPresets)).toBeNull();
  });
});
