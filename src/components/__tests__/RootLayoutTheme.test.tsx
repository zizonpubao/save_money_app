import { render } from '@testing-library/react-native';
import { Appearance } from 'react-native';

import RootLayout from '@/app/_layout';
import { initDatabase, resetDatabaseConnection, setSetting, SETTING_KEYS } from '@/src/db';

// 폰트가 아직 안 온 첫 렌더만 본다 — 그때 이미 bootDatabase(useState 초기화)가 돌았는지가 관심사
jest.mock('expo-font', () => ({ useFonts: () => [false, null] }));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

describe('앱 시작 — 저장한 테마 적용', () => {
  const appearanceSpy = jest.spyOn(Appearance, 'setColorScheme');

  beforeEach(() => {
    resetDatabaseConnection();
    appearanceSpy.mockClear();
  });

  afterAll(() => {
    appearanceSpy.mockRestore();
    resetDatabaseConnection();
  });

  it('저장한 dark 를 첫 렌더 전에(폰트 로드 전) 적용한다', async () => {
    initDatabase();
    setSetting(SETTING_KEYS.themeMode, 'dark');
    await render(<RootLayout />);
    expect(appearanceSpy).toHaveBeenCalledTimes(1);
    expect(appearanceSpy).toHaveBeenCalledWith('dark');
  });

  it('저장한 값이 없으면 시스템 설정 따르기(unspecified)', async () => {
    await render(<RootLayout />);
    expect(appearanceSpy).toHaveBeenCalledWith('unspecified');
  });
});
