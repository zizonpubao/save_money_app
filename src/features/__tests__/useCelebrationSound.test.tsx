import { act, renderHook } from '@testing-library/react-native';
import { setAudioModeAsync } from 'expo-audio';

import type * as AudioMock from '@/__mocks__/expo-audio';
import type { CelebrationSound } from '@/src/features/celebration';
import { AUDIO_MODE, SOUND_FILES, SOUND_VOLUME, useCelebrationSound } from '@/src/features/useCelebrationSound';
import { useSettingsStore } from '@/src/store/settingsStore';

// jest 는 모든 에셋을 같은 값(1)으로 바꾸므로, 어느 파일을 재생했는지 가리려고 파일마다 다른 id 를 준다
jest.mock('../../../assets/sounds/tap.wav', () => 101);
jest.mock('../../../assets/sounds/ding.wav', () => 102);
jest.mock('../../../assets/sounds/tada.wav', () => 103);
jest.mock('../../../assets/sounds/fanfare.wav', () => 104);
jest.mock('../../../assets/sounds/hit.wav', () => 105);

const { mockPlayers } = jest.requireMock<typeof AudioMock>('expo-audio');

function playerOf(sound: CelebrationSound) {
  const player = mockPlayers.find((p) => p.source === SOUND_FILES[sound]);
  if (!player) throw new Error(`${sound} 플레이어가 없다`);
  return player;
}

describe('useCelebrationSound (M4 효과음)', () => {
  beforeEach(() => {
    mockPlayers.length = 0;
    jest.mocked(setAudioModeAsync).mockClear();
    useSettingsStore.setState({ soundEnabled: true });
  });

  it('파일마다 다른 에셋이다', () => {
    expect(new Set(Object.values(SOUND_FILES)).size).toBe(5);
  });

  it('마운트 때 5개를 기기에 먼저 내려받아(downloadFirst) 로드하고, 무음 스위치를 따르며 다른 앱 음악과 섞는다', async () => {
    await renderHook(() => useCelebrationSound());
    expect(mockPlayers.map((p) => p.source)).toEqual([
      SOUND_FILES.tap,
      SOUND_FILES.tada,
      SOUND_FILES.hit,
      SOUND_FILES.fanfare,
      SOUND_FILES.ding,
    ]);
    for (const p of mockPlayers) expect(p.options).toEqual({ downloadFirst: true });
    expect(setAudioModeAsync).toHaveBeenCalledWith({
      playsInSilentMode: false,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
      allowsRecording: false,
    });
    expect(AUDIO_MODE.playsInSilentMode).toBe(false);
  });

  it('볼륨은 전부 최대(1)', async () => {
    await renderHook(() => useCelebrationSound());
    expect(SOUND_VOLUME).toBe(1);
    for (const sound of ['tap', 'tada', 'hit', 'fanfare', 'ding'] as const) {
      expect(playerOf(sound).volume).toBe(1);
    }
  });

  it.each(['tap', 'tada', 'hit', 'fanfare', 'ding'] as const)(
    '%s 를 부르면 처음 위치(0)라 그 파일만 바로 재생한다',
    async (sound) => {
      const { result } = await renderHook(() => useCelebrationSound());
      result.current(sound);
      expect(playerOf(sound).play).toHaveBeenCalledTimes(1);
      expect(playerOf(sound).seekTo).not.toHaveBeenCalled();
      const others = mockPlayers.filter((p) => p.source !== SOUND_FILES[sound]);
      for (const p of others) expect(p.play).not.toHaveBeenCalled();
    },
  );

  it('끝까지 재생된 뒤(위치 > 0) 다시 부르면 seekTo(0) 가 끝난 다음 play 한다', async () => {
    const { result } = await renderHook(() => useCelebrationSound());
    const tap = playerOf('tap');
    tap.currentTime = 0.1;
    await act(async () => {
      result.current('tap');
    });
    expect(tap.pause).not.toHaveBeenCalled();
    expect(tap.seekTo).toHaveBeenCalledWith(0, 0, 0);
    expect(tap.play).toHaveBeenCalledTimes(1);
    expect(tap.seekTo.mock.invocationCallOrder[0]).toBeLessThan(tap.play.mock.invocationCallOrder[0] ?? 0);
  });

  it('재생 중에 다시 부르면 pause → seekTo(0) → play', async () => {
    const { result } = await renderHook(() => useCelebrationSound());
    const ding = playerOf('ding');
    ding.playing = true;
    ding.currentTime = 0.05;
    await act(async () => {
      result.current('ding');
    });
    const order = [ding.pause, ding.seekTo, ding.play].map((m) => m.mock.invocationCallOrder[0] ?? -1);
    expect(order[0]).toBeGreaterThan(0);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('재생이 실패해도 예외를 밖으로 던지지 않는다 (저장 연출은 계속)', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = await renderHook(() => useCelebrationSound());
    playerOf('tada').play.mockImplementation(() => {
      throw new Error('no audio');
    });
    expect(() => result.current('tada')).not.toThrow();
    warn.mockRestore();
  });

  it('설정에서 효과음을 끄면 재생하지 않는다 (재생 순간에 읽어 바로 반영)', async () => {
    const { result } = await renderHook(() => useCelebrationSound());
    useSettingsStore.setState({ soundEnabled: false });
    result.current('fanfare');
    expect(mockPlayers.every((p) => p.play.mock.calls.length === 0)).toBe(true);
  });
});
