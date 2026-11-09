/** jest 용 react-native-view-shot 대역. iOS 처럼 file:// 없는 경로를 돌려준다. jest.setup.ts 에서 jest.mock('react-native-view-shot') */
export const captureRef = jest.fn((_view: unknown, _options?: unknown) =>
  Promise.resolve('/tmp/ReactNative/share-card.png'),
);
