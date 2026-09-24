import { setAudioModeAsync, useAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useCallback, useEffect } from 'react';

import dingWav from '@/assets/sounds/ding.wav';
import fanfareWav from '@/assets/sounds/fanfare.wav';
import tadaWav from '@/assets/sounds/tada.wav';
import tapWav from '@/assets/sounds/tap.wav';
import type { CelebrationSound } from '@/src/features/celebration';
import { useSettingsStore } from '@/src/store/settingsStore';

/** 효과음 파일 (scripts/gen-sounds.mjs 가 만든다) */
export const SOUND_FILES: Record<CelebrationSound, number> = {
  tap: tapWav,
  ding: dingWav,
  tada: tadaWav,
  fanfare: fanfareWav,
};

/** 볼륨. 작게 — 피날레(fanfare)만 조금 크게 */
export const SOUND_VOLUME: Record<CelebrationSound, number> = {
  tap: 0.35,
  ding: 0.35,
  tada: 0.35,
  fanfare: 0.5,
};

/**
 * (M4) 저장 효과음. 홈이 마운트될 때 4개를 미리 로드해 두고, 돌려받은 함수로 하나를 처음부터 재생한다.
 * - 무음 스위치를 따른다 (playsInSilentMode: false)
 * - 사용자가 듣던 음악을 끊지 않고 섞는다 (interruptionMode: 'mixWithOthers')
 * - 설정 탭 "효과음" 이 꺼져 있으면 재생하지 않는다 (재생 순간에 읽어 토글이 바로 반영된다)
 */
export function useCelebrationSound(): (sound: CelebrationSound) => void {
  const tap = useAudioPlayer(SOUND_FILES.tap);
  const ding = useAudioPlayer(SOUND_FILES.ding);
  const tada = useAudioPlayer(SOUND_FILES.tada);
  const fanfare = useAudioPlayer(SOUND_FILES.fanfare);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }, []);

  useEffect(() => {
    const players: [AudioPlayer, CelebrationSound][] = [
      [tap, 'tap'],
      [ding, 'ding'],
      [tada, 'tada'],
      [fanfare, 'fanfare'],
    ];
    for (const [player, name] of players) player.volume = SOUND_VOLUME[name];
  }, [tap, ding, tada, fanfare]);

  return useCallback(
    (sound: CelebrationSound) => {
      if (!useSettingsStore.getState().soundEnabled) return;
      const player = { tap, ding, tada, fanfare }[sound];
      // 소리가 안 나도 저장·연출은 그대로 간다
      try {
        player.seekTo(0).catch(() => {});
        player.play();
      } catch {
        // 무시
      }
    },
    [tap, ding, tada, fanfare],
  );
}
