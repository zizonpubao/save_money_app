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
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated/mock'));
