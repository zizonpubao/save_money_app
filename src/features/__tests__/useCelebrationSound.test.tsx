import { renderHook } from '@testing-library/react-native';
import { setAudioModeAsync } from 'expo-audio';

import type * as AudioMock from '@/__mocks__/expo-audio';
import type { CelebrationSound } from '@/src/features/celebration';
import { SOUND_FILES, SOUND_VOLUME, useCelebrationSound } from '@/src/features/useCelebrationSound';
import { useSettingsStore } from '@/src/store/settingsStore';

// jest 는 모든 에셋을 같은 값(1)으로 바꾸므로, 어느 파일을 재생했는지 가리려고 파일마다 다른 id 를 준다
jest.mock('../../../assets/sounds/tap.wav', () => 101);
jest.mock('../../../assets/sounds/ding.wav', () => 102);
jest.mock('../../../assets/sounds/tada.wav', () => 103);
jest.mock('../../../assets/sounds/fanfare.wav', () => 104);

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
    expect(new Set(Object.values(SOUND_FILES)).size).toBe(4);
  });

  it('홈 마운트 때 4개를 미리 로드하고, 무음 스위치를 따르며 다른 앱 음악과 섞는다', async () => {
    await renderHook(() => useCelebrationSound());
    expect(mockPlayers.map((p) => p.source)).toEqual([
      SOUND_FILES.tap,
      SOUND_FILES.ding,
      SOUND_FILES.tada,
      SOUND_FILES.fanfare,
    ]);
    expect(setAudioModeAsync).toHaveBeenCalledWith({
      playsInSilentMode: false,
      interruptionMode: 'mixWithOthers',
    });
  });

  it('볼륨은 작게 0.35, 피날레(fanfare)만 0.5', async () => {
    await renderHook(() => useCelebrationSound());
    for (const sound of ['tap', 'ding', 'tada', 'fanfare'] as const) {
      expect(playerOf(sound).volume).toBe(SOUND_VOLUME[sound]);
    }
    expect(SOUND_VOLUME.fanfare).toBe(0.5);
  });

  it.each(['tap', 'ding', 'tada', 'fanfare'] as const)(
    '%s 를 부르면 그 파일만 처음부터(seekTo 0) 재생한다',
    async (sound) => {
      const { result } = await renderHook(() => useCelebrationSound());
      result.current(sound);
      expect(playerOf(sound).seekTo).toHaveBeenCalledWith(0);
      expect(playerOf(sound).play).toHaveBeenCalledTimes(1);
      const others = mockPlayers.filter((p) => p.source !== SOUND_FILES[sound]);
      for (const p of others) expect(p.play).not.toHaveBeenCalled();
    },
  );

  it('설정에서 효과음을 끄면 재생하지 않는다 (재생 순간에 읽어 바로 반영)', async () => {
    const { result } = await renderHook(() => useCelebrationSound());
    useSettingsStore.setState({ soundEnabled: false });
    result.current('fanfare');
    expect(mockPlayers.every((p) => p.play.mock.calls.length === 0)).toBe(true);
  });
});
