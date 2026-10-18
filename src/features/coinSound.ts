/** 금액 칩·최근 항목 칩 동전 소리. 실제 녹음 두 개 중 설정에서 고른다 (assets/sounds/CREDITS.md) */
export type CoinSound = 'classic' | 'spin';

/** 설정 탭 칩 순서. 첫 번째가 기본값 */
export const COIN_SOUNDS: readonly CoinSound[] = ['classic', 'spin'];

export const COIN_SOUND_LABELS: Record<CoinSound, string> = {
  classic: '짤랑',
  spin: '빙글',
};

/** settings `coin_sound` 값. 없거나 모르는 값이면 classic */
export function parseCoinSound(value: string | null): CoinSound {
  return value === 'spin' ? 'spin' : 'classic';
}
