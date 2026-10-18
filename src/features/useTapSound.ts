import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useCallback, useEffect } from 'react';

import coinClassicWav from '@/assets/sounds/coin-classic.wav';
import coinLowWav from '@/assets/sounds/coin-low.wav';
import coinSpinWav from '@/assets/sounds/coin-spin.wav';
import popWav from '@/assets/sounds/pop.wav';
import toggleWav from '@/assets/sounds/toggle.wav';
import type { CoinSound } from '@/src/features/coinSound';
import { AUDIO_MODE, PLAYER_OPTIONS, playFromStart, TAP_VOLUME, warnDev } from '@/src/features/soundPlayer';
import { useSettingsStore } from '@/src/store/settingsStore';

/**
 * 입력 버튼 타격음 (DESIGN "입력 버튼 타격감"). coin 동전(설정에서 고른 녹음) · coinLow 툭 · toggle 딸깍 · pop 톡
 */
export type TapSound = 'coin' | 'coinLow' | 'toggle' | 'pop';

/** 실제로 플레이어를 만드는 파일 단위. coin 은 설정 값에 따라 coinClassic / coinSpin 중 하나가 된다 */
export type TapSoundFile = 'coinClassic' | 'coinSpin' | 'coinLow' | 'toggle' | 'pop';

/** 동전 녹음 2개(CREDITS.md)와 합성 타격음 3개(scripts/gen-sounds.mjs) */
export const TAP_SOUND_FILES: Record<TapSoundFile, number> = {
  coinClassic: coinClassicWav,
  coinSpin: coinSpinWav,
  coinLow: coinLowWav,
  toggle: toggleWav,
  pop: popWav,
};

const COIN_FILE: Record<CoinSound, TapSoundFile> = {
  classic: 'coinClassic',
  spin: 'coinSpin',
};

const FILE_KEYS = Object.keys(TAP_SOUND_FILES) as TapSoundFile[];

/**
 * 소리마다 미리 만들어 두는 플레이어 수. 한 플레이어로 연타하면 앞 소리를 멈추고 처음으로 되감아야 해서
 * 소리가 뚝 끊긴다. 3개를 번갈아 쓰면 연타해도 앞 소리가 이어서 울린다.
 */
export const TAP_POOL_SIZE = 3;

type Pools = Record<TapSoundFile, AudioPlayer[]>;

function makePool(file: number): AudioPlayer[] {
  return Array.from({ length: TAP_POOL_SIZE }, () => createAudioPlayer(file, PLAYER_OPTIONS));
}

/**
 * 앱 전체에서 한 벌만 만드는 플레이어 묶음. 입력 시트를 열 때마다 만들고 닫을 때 버리면
 * 시트를 연 직후 첫 탭에 로드가 덜 끝나 소리가 빠진다 (저장할 때마다 겪는 순간).
 * 그래서 홈이 뜰 때 preloadTapSounds() 로 미리 만들어 두고 앱이 살아 있는 동안 재사용한다 (파일 5개 × 3 = 15개).
 * 동전 녹음은 두 개 다 만든다 — 설정에서 바꾼 직후 첫 탭에도 바로 나게.
 */
let sharedPools: Pools | null = null;
const nextIndex: Record<TapSoundFile, number> = {
  coinClassic: 0,
  coinSpin: 0,
  coinLow: 0,
  toggle: 0,
  pop: 0,
};

/** 플레이어 묶음을 (아직 없으면) 만든다. 여러 번 불러도 한 번만 만든다 */
export function preloadTapSounds(): void {
  if (sharedPools) return;
  setAudioModeAsync(AUDIO_MODE).catch((error: unknown) => warnDev('오디오 모드 설정 실패', error));
  try {
    sharedPools = {
      coinClassic: makePool(TAP_SOUND_FILES.coinClassic),
      coinSpin: makePool(TAP_SOUND_FILES.coinSpin),
      coinLow: makePool(TAP_SOUND_FILES.coinLow),
      toggle: makePool(TAP_SOUND_FILES.toggle),
      pop: makePool(TAP_SOUND_FILES.pop),
    };
  } catch (error) {
    // 소리를 못 만들어도 입력과 햅틱은 그대로 간다
    warnDev('타격음 플레이어 생성 실패', error);
  }
}

/** 테스트 전용: 공유 플레이어와 순번을 비운다 */
export function resetTapSoundsForTest(): void {
  sharedPools = null;
  for (const key of FILE_KEYS) nextIndex[key] = 0;
}

/** 이 소리가 지금 쓸 파일. coin 은 재생 순간의 설정 값을 읽어 설정 탭에서 바꾸면 바로 반영된다 */
export function tapSoundFile(sound: TapSound): TapSoundFile {
  if (sound === 'coin') return COIN_FILE[useSettingsStore.getState().coinSound];
  return sound;
}

/** 그 파일의 다음 플레이어(round-robin)로 처음부터 재생한다 */
function playTap(sound: TapSound): void {
  if (!useSettingsStore.getState().soundEnabled) return;
  const file = tapSoundFile(sound);
  const pool = sharedPools?.[file];
  if (!pool || pool.length === 0) return;
  const index = nextIndex[file];
  nextIndex[file] = (index + 1) % pool.length;
  const player = pool[index];
  if (player) playFromStart(player, file, TAP_VOLUME);
}

/**
 * 금액 입력 화면 버튼 타격음. 공유 플레이어 묶음이 없으면 마운트 때 만들고, 돌려받은 함수로 재생한다.
 * - 무음 스위치를 따른다(저장 효과음과 같은 AUDIO_MODE). 무음 모드에서는 햅틱만 남는다
 * - 설정 탭 "효과음" 이 꺼져 있으면 재생하지 않는다 (재생 순간에 읽어 토글이 바로 반영된다)
 */
export function useTapSound(): (sound: TapSound) => void {
  useEffect(() => {
    preloadTapSounds();
  }, []);
  return useCallback((sound: TapSound) => playTap(sound), []);
}
