import { renderHook } from '@testing-library/react-native';
import { setAudioModeAsync } from 'expo-audio';

import type * as AudioMock from '@/__mocks__/expo-audio';
import { AUDIO_MODE } from '@/src/features/soundPlayer';
import {
  preloadTapSounds,
  resetTapSoundsForTest,
  TAP_POOL_SIZE,
  TAP_SOUND_FILES,
  useTapSound,
  type TapSound,
} from '@/src/features/useTapSound';
import { useSettingsStore } from '@/src/store/settingsStore';

// jest 는 모든 에셋을 같은 값(1)으로 바꾸므로, 어느 파일을 재생했는지 가리려고 파일마다 다른 id 를 준다
jest.mock('../../../assets/sounds/coin.wav', () => 201);
jest.mock('../../../assets/sounds/coin-low.wav', () => 202);
jest.mock('../../../assets/sounds/toggle.wav', () => 203);
jest.mock('../../../assets/sounds/pop.wav', () => 204);

const { mockPlayers } = jest.requireMock<typeof AudioMock>('expo-audio');

const SOUNDS: TapSound[] = ['coin', 'coinLow', 'toggle', 'pop'];

function poolOf(sound: TapSound) {
  return mockPlayers.filter((p) => p.source === TAP_SOUND_FILES[sound]);
}

/** 그 소리 플레이어들이 각각 몇 번 재생됐는지 */
function playsOf(sound: TapSound): number[] {
  return poolOf(sound).map((p) => p.play.mock.calls.length);
}

describe('useTapSound (입력 버튼 타격음)', () => {
  beforeEach(() => {
    resetTapSoundsForTest();
    mockPlayers.length = 0;
    jest.mocked(setAudioModeAsync).mockClear();
    useSettingsStore.setState({ soundEnabled: true });
  });

  it('파일마다 다른 에셋이다', () => {
    expect(new Set(Object.values(TAP_SOUND_FILES)).size).toBe(4);
  });

  it('마운트 때 소리마다 플레이어 3개를 기기에 먼저 내려받아(downloadFirst) 만들고, 저장 효과음과 같은 오디오 모드를 쓴다', async () => {
    await renderHook(() => useTapSound());
    expect(TAP_POOL_SIZE).toBe(3);
    expect(mockPlayers).toHaveLength(4 * TAP_POOL_SIZE);
    for (const sound of SOUNDS) expect(poolOf(sound)).toHaveLength(TAP_POOL_SIZE);
    for (const p of mockPlayers) expect(p.options).toEqual({ downloadFirst: true });
    // 무음 스위치를 따른다 (무음 모드에서는 햅틱만 남는다)
    expect(setAudioModeAsync).toHaveBeenCalledWith(AUDIO_MODE);
    expect(AUDIO_MODE.playsInSilentMode).toBe(false);
    expect(AUDIO_MODE.interruptionMode).toBe('mixWithOthers');
  });

  it.each(SOUNDS)('%s 를 부르면 그 소리 플레이어만 재생한다', async (sound) => {
    const { result } = await renderHook(() => useTapSound());
    result.current(sound);
    expect(playsOf(sound)).toEqual([1, 0, 0]);
    const others = mockPlayers.filter((p) => p.source !== TAP_SOUND_FILES[sound]);
    for (const p of others) expect(p.play).not.toHaveBeenCalled();
  });

  it('연타하면 플레이어를 번갈아 쓴다 (0 → 1 → 2 → 다시 0). 앞 소리를 멈추지 않는다', async () => {
    const { result } = await renderHook(() => useTapSound());
    const pool = poolOf('coin');
    result.current('coin');
    result.current('coin');
    result.current('coin');
    expect(playsOf('coin')).toEqual([1, 1, 1]);
    const order = pool.map((p) => p.play.mock.invocationCallOrder[0] ?? -1);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    result.current('coin');
    expect(playsOf('coin')).toEqual([2, 1, 1]);
    for (const p of pool) expect(p.pause).not.toHaveBeenCalled();
  });

  it('소리마다 순번이 따로 돈다 (coin 을 눌러도 pop 은 첫 플레이어부터)', async () => {
    const { result } = await renderHook(() => useTapSound());
    result.current('coin');
    result.current('coin');
    result.current('pop');
    expect(playsOf('coin')).toEqual([1, 1, 0]);
    expect(playsOf('pop')).toEqual([1, 0, 0]);
  });

  it('설정에서 효과음을 끄면 재생하지 않는다 (재생 순간에 읽어 바로 반영)', async () => {
    const { result } = await renderHook(() => useTapSound());
    useSettingsStore.setState({ soundEnabled: false });
    for (const sound of SOUNDS) result.current(sound);
    expect(mockPlayers.every((p) => p.play.mock.calls.length === 0)).toBe(true);
    useSettingsStore.setState({ soundEnabled: true });
    result.current('toggle');
    expect(playsOf('toggle')).toEqual([1, 0, 0]);
  });

  it('재생이 실패해도 예외를 밖으로 던지지 않는다 (입력은 계속)', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = await renderHook(() => useTapSound());
    poolOf('pop')[0]?.play.mockImplementation(() => {
      throw new Error('no audio');
    });
    expect(() => result.current('pop')).not.toThrow();
    warn.mockRestore();
  });

  it('플레이어는 앱에서 한 벌만 만든다 — 시트를 닫았다 다시 열어도 새로 만들지 않고 그대로 재생한다', async () => {
    const first = await renderHook(() => useTapSound());
    await first.unmount();
    for (const p of mockPlayers) expect(p.remove).not.toHaveBeenCalled();
    const second = await renderHook(() => useTapSound());
    expect(mockPlayers).toHaveLength(4 * TAP_POOL_SIZE);
    second.result.current('coin');
    expect(playsOf('coin')).toEqual([1, 0, 0]);
  });

  it('홈에서 미리 불러 두면(preloadTapSounds) 시트를 연 직후 첫 탭부터 재생된다', async () => {
    preloadTapSounds();
    preloadTapSounds();
    expect(mockPlayers).toHaveLength(4 * TAP_POOL_SIZE);
    const { result } = await renderHook(() => useTapSound());
    result.current('pop');
    expect(playsOf('pop')).toEqual([1, 0, 0]);
  });
});
