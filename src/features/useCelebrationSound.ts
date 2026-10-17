import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect } from 'react';

import dingWav from '@/assets/sounds/ding.wav';
import fanfareWav from '@/assets/sounds/fanfare.wav';
import hitWav from '@/assets/sounds/hit.wav';
import tadaWav from '@/assets/sounds/tada.wav';
import tapWav from '@/assets/sounds/tap.wav';
import type { CelebrationSound } from '@/src/features/celebration';
import { AUDIO_MODE, PLAYER_OPTIONS, SOUND_VOLUME, playFromStart, warnDev } from '@/src/features/soundPlayer';
import { useSettingsStore } from '@/src/store/settingsStore';

/** 효과음 파일 (scripts/gen-sounds.mjs 가 만든다) */
export const SOUND_FILES: Record<CelebrationSound, number> = {
  tap: tapWav,
  tada: tadaWav,
  hit: hitWav,
  fanfare: fanfareWav,
  ding: dingWav,
};

/**
 * 설정 탭 "미리 듣기" 칩 이름. 칩은 이 키 순서대로 놓인다 (base 톡 → mid 짠 → big 쾅 → 목표 팡파르 → 이정표 띵)
 */
export const SOUND_LABELS: Record<CelebrationSound, string> = {
  tap: '톡',
  tada: '짠',
  hit: '쾅',
  fanfare: '팡파르',
  ding: '띵',
};

// 테스트·설정 화면이 이 파일에서 가져다 쓰던 이름이라 그대로 내보낸다
export { AUDIO_MODE, SOUND_VOLUME };

/**
 * (M4) 저장 효과음. 마운트될 때 5개를 미리 내려받아 로드해 두고, 돌려받은 함수로 하나를 처음부터 재생한다.
 * 홈(저장 축하)과 설정(미리 듣기)이 쓴다.
 * - 설정 탭 "효과음" 이 꺼져 있으면 재생하지 않는다 (재생 순간에 읽어 토글이 바로 반영된다)
 */
export function useCelebrationSound(): (sound: CelebrationSound) => void {
  const tap = useAudioPlayer(SOUND_FILES.tap, PLAYER_OPTIONS);
  const tada = useAudioPlayer(SOUND_FILES.tada, PLAYER_OPTIONS);
  const hit = useAudioPlayer(SOUND_FILES.hit, PLAYER_OPTIONS);
  const fanfare = useAudioPlayer(SOUND_FILES.fanfare, PLAYER_OPTIONS);
  const ding = useAudioPlayer(SOUND_FILES.ding, PLAYER_OPTIONS);

  useEffect(() => {
    setAudioModeAsync(AUDIO_MODE).catch((error: unknown) => warnDev('오디오 모드 설정 실패', error));
  }, []);

  useEffect(() => {
    for (const player of [tap, tada, hit, fanfare, ding]) player.volume = SOUND_VOLUME;
  }, [tap, tada, hit, fanfare, ding]);

  return useCallback(
    (sound: CelebrationSound) => {
      if (!useSettingsStore.getState().soundEnabled) return;
      playFromStart({ tap, tada, hit, fanfare, ding }[sound], sound);
    },
    [tap, tada, hit, fanfare, ding],
  );
}
