/** jest 용 expo-store-review 대역. 별점 창 대신 호출만 기록한다. jest.setup.ts 에서 jest.mock('expo-store-review') */
export const isAvailableAsync = jest.fn(() => Promise.resolve(true));
export const hasAction = jest.fn(() => Promise.resolve(true));
export const requestReview = jest.fn(() => Promise.resolve());
