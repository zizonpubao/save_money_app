/** jest 용 expo-sharing 대역. 공유 시트 대신 호출만 기록한다. jest.setup.ts 에서 jest.mock('expo-sharing') */
export const isAvailableAsync = jest.fn(() => Promise.resolve(true));
export const shareAsync = jest.fn((_url: string, _options?: unknown) => Promise.resolve());
