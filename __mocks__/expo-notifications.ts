/** jest 용 expo-notifications 대역. 예약 대신 호출만 기록한다. jest.setup.ts 에서 jest.mock('expo-notifications') */
export const SchedulableTriggerInputTypes = { DATE: 'date' } as const;
export const AndroidImportance = { DEFAULT: 3 } as const;

type Permission = { granted: boolean; canAskAgain: boolean };

export const getPermissionsAsync = jest.fn(
  (): Promise<Permission> => Promise.resolve({ granted: true, canAskAgain: true }),
);
export const requestPermissionsAsync = jest.fn(
  (_options?: unknown): Promise<Permission> => Promise.resolve({ granted: true, canAskAgain: true }),
);
export const scheduleNotificationAsync = jest.fn((_request: unknown) => Promise.resolve('id'));
export const cancelAllScheduledNotificationsAsync = jest.fn(() => Promise.resolve());
export const setNotificationChannelAsync = jest.fn((_id: string, _channel: unknown) => Promise.resolve(null));
