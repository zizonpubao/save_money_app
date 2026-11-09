/** jest 용 expo-notifications 대역. 예약 대신 호출만 기록한다. jest.setup.ts 에서 jest.mock('expo-notifications') */
export const SchedulableTriggerInputTypes = { DATE: 'date', TIME_INTERVAL: 'timeInterval' } as const;
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
/**
 * 남아 있는 예약 목록. 기본은 "마지막 mockClear 뒤에 예약한 것 전부" 다 (취소는 따로 세지 않는다).
 * 예약이 조용히 무시된 경우를 흉내 내려면 테스트에서 mockResolvedValue([]) 로 덮는다
 */
export const getAllScheduledNotificationsAsync = jest.fn(
  (): Promise<unknown[]> => Promise.resolve(scheduleNotificationAsync.mock.calls.map(([request]) => request)),
);
export const setNotificationChannelAsync = jest.fn((_id: string, _channel: unknown) => Promise.resolve(null));
