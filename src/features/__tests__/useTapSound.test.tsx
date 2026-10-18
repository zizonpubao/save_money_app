import { renderHook } from '@testing-library/react-native';
import { setAudioModeAsync } from 'expo-audio';

import type * as AudioMock from '@/__mocks__/expo-audio';
import { AUDIO_MODE, TAP_VOLUME } from '@/src/features/soundPlayer';
import {
  preloadTapSounds,
  resetTapSoundsForTest,
  TAP_POOL_SIZE,
  TAP_SOUND_FILES,
  tapSoundFile,
  useTapSound,
  type TapSound,
  type TapSoundFile,
} from '@/src/features/useTapSound';
import { useSettingsStore } from '@/src/store/settingsStore';

// jest 는 모든 에셋을 같은 값(1)으로 바꾸므로, 어느 파일을 재생했는지 가리려고 파일마다 다른 id 를 준다
jest.mock('../../../assets/sounds/coin-classic.wav', () => 201);
jest.mock('../../../assets/sounds/coin-spin.wav', () => 205);
jest.mock('../../../assets/sounds/coin-low.wav', () => 202);
jest.mock('../../../assets/sounds/toggle.wav', () => 203);
jest.mock('../../../assets/sounds/pop.wav', () => 204);

const { mockPlayers } = jest.requireMock<typeof AudioMock>('expo-audio');

const SOUNDS: TapSound[] = ['coin', 'coinLow', 'toggle', 'pop'];
const FILES = Object.keys(TAP_SOUND_FILES) as TapSoundFile[];

/** coin 은 기본 설정(classic) 파일로 본다 */
function fileOf(sound: TapSound | TapSoundFile): TapSoundFile {
  return sound === 'coin' ? 'coinClassic' : sound;
}

function poolOf(sound: TapSound | TapSoundFile) {
  return mockPlayers.filter((p) => p.source === TAP_SOUND_FILES[fileOf(sound)]);
}

/** 그 소리 플레이어들이 각각 몇 번 재생됐는지 */
function playsOf(sound: TapSound | TapSoundFile): number[] {
  return poolOf(sound).map((p) => p.play.mock.calls.length);
}

describe('useTapSound (입력 버튼 타격음)', () => {
  beforeEach(() => {
    resetTapSoundsForTest();
    mockPlayers.length = 0;
    jest.mocked(setAudioModeAsync).mockClear();
    useSettingsStore.setState({ soundEnabled: true, coinSound: 'classic' });
  });

  it('파일마다 다른 에셋이다 (동전 녹음 2개 + 띵-동·딸깍·톡)', () => {
    expect(FILES).toEqual(['coinClassic', 'coinSpin', 'coinLow', 'toggle', 'pop']);
    expect(new Set(Object.values(TAP_SOUND_FILES)).size).toBe(5);
  });

  it('마운트 때 소리마다 플레이어 3개를 기기에 먼저 내려받아(downloadFirst) 만들고, 저장 효과음과 같은 오디오 모드를 쓴다', async () => {
    await renderHook(() => useTapSound());
    expect(TAP_POOL_SIZE).toBe(3);
    expect(mockPlayers).toHaveLength(5 * TAP_POOL_SIZE);
    // 고르지 않은 동전 녹음도 미리 만든다 — 설정에서 바꾼 직후 첫 탭에도 바로 나게
    for (const file of FILES) expect(poolOf(file)).toHaveLength(TAP_POOL_SIZE);
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
    const others = mockPlayers.filter((p) => p.source !== TAP_SOUND_FILES[fileOf(sound)]);
    for (const p of others) expect(p.play).not.toHaveBeenCalled();
  });

  it.each(SOUNDS)('%s 는 저장 효과음(1)보다 작은 0.6 볼륨으로 재생한다 (피드백 "전체적으로 커, 60%")', async (sound) => {
    const { result } = await renderHook(() => useTapSound());
    result.current(sound);
    const played = poolOf(sound).find((p) => p.play.mock.calls.length > 0);
    expect(TAP_VOLUME).toBe(0.6);
    expect(played?.volume).toBe(TAP_VOLUME);
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
    expect(mockPlayers).toHaveLength(5 * TAP_POOL_SIZE);
    second.result.current('coin');
    expect(playsOf('coin')).toEqual([1, 0, 0]);
  });

  it('홈에서 미리 불러 두면(preloadTapSounds) 시트를 연 직후 첫 탭부터 재생된다', async () => {
    preloadTapSounds();
    preloadTapSounds();
    expect(mockPlayers).toHaveLength(5 * TAP_POOL_SIZE);
    const { result } = await renderHook(() => useTapSound());
    result.current('pop');
    expect(playsOf('pop')).toEqual([1, 0, 0]);
  });

  it('coin 은 기본(classic)이면 짤랑 녹음을 재생한다', async () => {
    const { result } = await renderHook(() => useTapSound());
    expect(tapSoundFile('coin')).toBe('coinClassic');
    result.current('coin');
    expect(playsOf('coinClassic')).toEqual([1, 0, 0]);
    expect(playsOf('coinSpin')).toEqual([0, 0, 0]);
  });

  it('설정을 spin 으로 바꾸면 다음 coin 부터 빙글 녹음을 재생한다 (재생 순간에 읽는다)', async () => {
    const { result } = await renderHook(() => useTapSound());
    result.current('coin');
    useSettingsStore.setState({ coinSound: 'spin' });
    expect(tapSoundFile('coin')).toBe('coinSpin');
    result.current('coin');
    result.current('coin');
    expect(playsOf('coinSpin')).toEqual([1, 1, 0]);
    expect(playsOf('coinClassic')).toEqual([1, 0, 0]);
    // 돌아가면 classic 은 자기 순번(1)부터 이어 간다
    useSettingsStore.setState({ coinSound: 'classic' });
    result.current('coin');
    expect(playsOf('coinClassic')).toEqual([1, 1, 0]);
  });

  it('동전 설정은 − 모드 띵-동·딸깍·톡에는 영향이 없다', async () => {
    useSettingsStore.setState({ coinSound: 'spin' });
    const { result } = await renderHook(() => useTapSound());
    result.current('coinLow');
    result.current('toggle');
    result.current('pop');
    expect(playsOf('coinLow')).toEqual([1, 0, 0]);
    expect(playsOf('toggle')).toEqual([1, 0, 0]);
    expect(playsOf('pop')).toEqual([1, 0, 0]);
    expect(playsOf('coinSpin')).toEqual([0, 0, 0]);
    expect(playsOf('coinClassic')).toEqual([0, 0, 0]);
  });
});
