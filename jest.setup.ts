import initSqlJs from 'sql.js';

import { setSqlJs } from './__mocks__/sqlJsRuntime';

/**
 * sql.js 초기화만 담당한다. expo-sqlite 대역(__mocks__/expo-sqlite.ts)이 동기 API 를
 * 제공하려면 wasm 이 먼저 로드돼 있어야 하므로, 모든 테스트 파일 앞에서 한 번 로드한다.
 * (setupFilesAfterEnv 에 등록돼 있어 이 beforeAll 은 각 테스트 파일의 첫 테스트 전에 돈다.
 *  jest 는 node 환경이라 sql-wasm.wasm 을 dist 폴더에서 알아서 찾는다.)
 */
beforeAll(async () => {
  setSqlJs(await initSqlJs());
});

/**
 * 컴포넌트 렌더 테스트용: reanimated 4 는 react-native-worklets 네이티브 모듈을 import 시점에 찾으므로
 * jest(노드)에서는 두 라이브러리가 제공하는 공식 mock 으로 바꾼다. 애니메이션은 즉시 끝난 값으로 보인다.
 */
// 주의: 'react-native-worklets/src/mock' 은 패키지 내부 경로다 (공개 export 가 아님).
// worklets 버전을 올리면 파일이 옮겨지거나 사라져 모든 컴포넌트 테스트가 import 단계에서 깨질 수 있다.
// 그때는 node_modules/react-native-worklets 에서 mock 파일 위치를 다시 찾아 이 경로를 고친다.
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated/mock'));

/** expo-audio 는 네이티브 모듈이라 jest 에서는 __mocks__/expo-audio.ts 대역으로 바꾼다 (홈 화면이 효과음 훅을 쓴다) */
jest.mock('expo-audio');

/**
 * (M5) 백업 파일 입출력 모듈도 네이티브라 __mocks__ 대역으로 바꾼다 (설정 화면이 import 한다).
 * 파일 내용은 __mocks__/expo-file-system.ts 의 mockFiles 에 남아, 내보내기 → 복원 왕복 테스트에 쓴다.
 */
jest.mock('expo-file-system');
jest.mock('expo-sharing');
jest.mock('expo-document-picker');

/**
 * (Android 대응) 모달·기록 수정 화면이 useSafeAreaInsets 를 쓴다. 테스트는 SafeAreaProvider 없이 화면을 그리므로
 * 라이브러리 공식 대역으로 바꾼다 (inset 0, useSafeAreaInsets 는 jest.fn 이라 테스트가 값을 정할 수 있다).
 */
jest.mock('react-native-safe-area-context', () =>
  jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
