import { setAudioModeAsync, useAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useCallback, useEffect } from 'react';

import dingWav from '@/assets/sounds/ding.wav';
import fanfareWav from '@/assets/sounds/fanfare.wav';
import hitWav from '@/assets/sounds/hit.wav';
import tadaWav from '@/assets/sounds/tada.wav';
import tapWav from '@/assets/sounds/tap.wav';
import type { CelebrationSound } from '@/src/features/celebration';
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

/**
 * 플레이어 볼륨. 전부 최대 — 크기 차이는 파일(피크 -1 dBFS 로 맞춤)이 아니라 소리 자체(길이·음 수)로 낸다.
 * 예전 0.35 는 아이폰 스피커에서 거의 안 들렸다.
 */
export const SOUND_VOLUME = 1;

/** 무음 스위치를 따르고(.ambient), 사용자가 듣던 음악을 끊지 않고 섞는다. 백그라운드 재생 없음 */
export const AUDIO_MODE = {
  playsInSilentMode: false,
  interruptionMode: 'mixWithOthers',
  shouldPlayInBackground: false,
  allowsRecording: false,
} as const;

/**
 * Expo Go 개발 중에는 에셋 주소가 Metro 서버 URL 이라 AVPlayer 가 형식을 못 알아채 조용히 실패할 수 있다.
 * downloadFirst 로 expo-asset 이 기기에 먼저 내려받은 file:// 경로를 쓰게 한다 (배포 빌드에서도 무해).
 */
const PLAYER_OPTIONS = { downloadFirst: true } as const;

function warnDev(message: string, error?: unknown): void {
  if (__DEV__) console.warn(`[효과음] ${message}`, error ?? '');
}

/**
 * 처음부터 재생. 끝까지 재생된 플레이어는 끝 위치에 멈춰 있어 play() 만 부르면 소리 없이 끝나므로,
 * 위치가 0 이 아니거나 재생 중이면 pause → seekTo(0) 가 끝난 뒤 play 한다 (seek 은 네이티브 비동기).
 */
function playFromStart(player: AudioPlayer, name: CelebrationSound): void {
  try {
    if (!player.isLoaded) warnDev(`${name} 가 아직 로드되지 않았다`);
    player.volume = SOUND_VOLUME;
    if (!player.playing && player.currentTime === 0) {
      player.play();
      return;
    }
    if (player.playing) player.pause();
    player
      .seekTo(0, 0, 0)
      .then(() => player.play())
      .catch((error: unknown) => warnDev(`${name} 재생 실패`, error));
  } catch (error) {
    // 소리가 안 나도 저장·연출은 그대로 간다
    warnDev(`${name} 재생 실패`, error);
  }
}

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
