import { useRef } from 'react';

/**
 * jest 용 expo-audio 대역 (네이티브 오디오 모듈이 없다). jest.setup.ts 에서 jest.mock('expo-audio') 로 쓴다.
 * useAudioPlayer 는 훅 인스턴스마다 같은 가짜 플레이어를 돌려주고, 만든 플레이어를 mockPlayers 에 모아
 * 테스트가 "어느 파일을 재생했는지" 볼 수 있게 한다.
 */
export type MockAudioPlayer = {
  source: unknown;
  options: unknown;
  volume: number;
  /** 테스트가 "재생 중" · "끝까지 재생됨"(currentTime > 0) 상태를 흉내 낼 때 바꾼다 */
  playing: boolean;
  currentTime: number;
  isLoaded: boolean;
  play: jest.Mock;
  pause: jest.Mock;
  seekTo: jest.Mock;
  remove: jest.Mock;
};

export const mockPlayers: MockAudioPlayer[] = [];

function makePlayer(source: unknown, options?: unknown): MockAudioPlayer {
  const player: MockAudioPlayer = {
    source,
    options,
    volume: 1,
    playing: false,
    currentTime: 0,
    isLoaded: true,
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(() => Promise.resolve()),
    remove: jest.fn(),
  };
  mockPlayers.push(player);
  return player;
}

export function useAudioPlayer(source: unknown, options?: unknown): MockAudioPlayer {
  const ref = useRef<MockAudioPlayer | null>(null);
  if (ref.current === null) ref.current = makePlayer(source, options);
  return ref.current;
}

export function createAudioPlayer(source: unknown, options?: unknown): MockAudioPlayer {
  return makePlayer(source, options);
}

export const setAudioModeAsync = jest.fn(() => Promise.resolve());
