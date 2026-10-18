import type { AudioPlayer } from 'expo-audio';

/**
 * 효과음 재생 공용 부분. 저장 축하(useCelebrationSound)와 입력 버튼 타격음(useTapSound)이 같이 쓴다.
 */

/**
 * 플레이어 볼륨. 전부 최대 — 크기 차이는 파일(피크 dBFS)이 아니라 소리 자체(길이·음 수)로 낸다.
 * 예전 0.35 는 아이폰 스피커에서 거의 안 들렸다.
 */
export const SOUND_VOLUME = 1;

/**
 * 입력 버튼 타격음 볼륨. 아이폰 피드백 "전체적으로 소리가 커, 지금의 60% 수준으로" (빌드 7 전 Expo Go 확인).
 * 파일 사이 크기 균형(스피커 기준 3dB 이내)은 그대로 두고 재생 볼륨만 낮춘다
 */
export const TAP_VOLUME = 0.6;

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
export const PLAYER_OPTIONS = { downloadFirst: true } as const;

export function warnDev(message: string, error?: unknown): void {
  if (__DEV__) console.warn(`[효과음] ${message}`, error ?? '');
}

/**
 * 처음부터 재생. 끝까지 재생된 플레이어는 끝 위치에 멈춰 있어 play() 만 부르면 소리 없이 끝나므로,
 * 위치가 0 이 아니거나 재생 중이면 pause → seekTo(0) 가 끝난 뒤 play 한다 (seek 은 네이티브 비동기).
 */
export function playFromStart(player: AudioPlayer, name: string, volume: number = SOUND_VOLUME): void {
  try {
    if (!player.isLoaded) warnDev(`${name} 가 아직 로드되지 않았다`);
    player.volume = volume;
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
    // 소리가 안 나도 저장·입력은 그대로 간다
    warnDev(`${name} 재생 실패`, error);
  }
}
