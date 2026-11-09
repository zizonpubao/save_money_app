import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Sharing from 'expo-sharing';
import { Alert, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { captureRef } from 'react-native-view-shot';

import RecordsScreen from '@/app/(tabs)/monthly';
import { ShareCard } from '@/src/components/ShareCard';
import { addCategory, addEntry, initDatabase, resetDatabaseConnection } from '@/src/db';
import type { ShareCardData } from '@/src/features/shareCard';
import { useCategoryStore } from '@/src/store/categoryStore';
import { brandColors, lightColors, size, typeScale } from '@/src/theme';
import { formatKoMonth, formatKoYear, thisMonth, thisYear, today } from '@/src/utils/date';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').useEffect(callback, [callback]);
  },
}));

jest.mock('@/src/components/EntryRow', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return { EntryRow: ({ entry }: { entry: { title: string } }) => <Text>{entry.title}</Text> };
});

const DATA: ShareCardData = {
  periodLabel: '2026년 10월',
  amountText: '110,000원',
  countText: '기록 12건',
  topCategoryText: '☕ 커피',
};

const alertSpy = jest.spyOn(Alert, 'alert');

describe('ShareCard', () => {
  it('기간·금액·건수·최다 카테고리·앱 이름을 그린다', async () => {
    await render(<ShareCard data={DATA} />);
    for (const text of ['2026년 10월', '110,000원', '아꼈어요', '기록 12건', '☕ 커피', 'SaveLog']) {
      expect(screen.getByText(text)).toBeOnTheScreen();
    }
  });

  it('4:5 크기에 테마와 상관없는 크림 바탕이다', async () => {
    await render(<ShareCard data={DATA} />);
    const style = StyleSheet.flatten(screen.getByTestId('share-card').props.style);
    expect(style.width / style.height).toBeCloseTo(4 / 5);
    expect(style.backgroundColor).toBe(lightColors.bg);
    expect(size.shareCardExportWidth / size.shareCardExportHeight).toBeCloseTo(4 / 5);
  });

  it('금액은 숫자 폰트를 쓰고 네이티브 자동 줄임은 쓰지 않는다', async () => {
    await render(<ShareCard data={DATA} />);
    const amount = screen.getByText('110,000원');
    expect(StyleSheet.flatten(amount.props.style).fontFamily).toBe(typeScale.shareAmount.fontFamily);
    expect(amount.props.adjustsFontSizeToFit).toBeUndefined();
  });

  it('금액이 길면 글자를 줄인다', async () => {
    await render(<ShareCard data={{ ...DATA, amountText: '1,234,567,890원' }} />);
    const style = StyleSheet.flatten(screen.getByText('1,234,567,890원').props.style);
    expect(style.fontSize).toBeLessThan(typeScale.shareAmount.fontSize);
  });

  it('주황은 면으로만 쓴다', async () => {
    await render(<ShareCard data={DATA} />);
    const chip = StyleSheet.flatten(screen.getByText('☕ 커피').props.style);
    expect(chip.color).toBe(brandColors.onAccent);
    expect(chip.color).not.toBe(brandColors.accent);
  });
});

describe('기록 탭 자랑하기', () => {
  beforeEach(() => {
    resetDatabaseConnection();
    initDatabase();
    useCategoryStore.setState({ categories: [], loaded: false });
    alertSpy.mockClear();
    alertSpy.mockImplementation(() => undefined);
    jest.mocked(captureRef).mockClear();
    jest.mocked(captureRef).mockResolvedValue('/tmp/ReactNative/share-card.png');
    jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(true);
    jest.mocked(Sharing.shareAsync).mockClear();
    jest.mocked(Sharing.shareAsync).mockResolvedValue(undefined);
  });

  afterAll(() => {
    alertSpy.mockRestore();
    resetDatabaseConnection();
  });

  function addSample() {
    const category = addCategory({ name: '간식창고', emoji: '🍪' });
    addEntry({ date: today(), title: '쿠키', amount: 110000, categoryId: category.id, memo: null });
  }

  async function openPreview() {
    await render(<RecordsScreen />, { wrapper: GestureHandlerRootView });
    await fireEvent.press(screen.getByRole('button', { name: '자랑하기' }));
  }

  it('합계가 0원이면 비활성이다', async () => {
    await render(<RecordsScreen />, { wrapper: GestureHandlerRootView });
    const button = screen.getByRole('button', { name: '자랑하기' });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(screen.queryByTestId('share-card')).toBeNull();
  });

  it('월 모드: 미리보기에 그 달 카드가 보인다', async () => {
    addSample();
    await openPreview();
    expect(screen.getByTestId('share-card')).toBeOnTheScreen();
    expect(screen.getAllByText(formatKoMonth(thisMonth())).length).toBeGreaterThan(0);
    expect(screen.getByText('🍪 간식창고')).toBeOnTheScreen();
  });

  it('년 모드: 카드 기간이 그 해다', async () => {
    addSample();
    await render(<RecordsScreen />, { wrapper: GestureHandlerRootView });
    await fireEvent.press(screen.getByText('년'));
    await fireEvent.press(screen.getByRole('button', { name: '자랑하기' }));
    expect(screen.getAllByText(formatKoYear(thisYear())).length).toBeGreaterThan(1);
  });

  it('공유하기는 PNG 로 찍어 file:// 주소로 공유 시트에 보낸다', async () => {
    addSample();
    await openPreview();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '공유하기' }));
      await Promise.resolve();
    });
    expect(jest.mocked(captureRef).mock.calls[0]?.[1]).toMatchObject({ format: 'png', result: 'tmpfile' });
    expect(jest.mocked(Sharing.shareAsync).mock.calls[0]?.[0]).toBe('file:///tmp/ReactNative/share-card.png');
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('캡처가 실패하면 짧은 안내만 보여 준다', async () => {
    jest.mocked(captureRef).mockRejectedValue(new Error('no'));
    addSample();
    await openPreview();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '공유하기' }));
      await Promise.resolve();
    });
    expect(alertSpy.mock.calls.at(-1)?.[0]).toBe('공유하지 못했어요');
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
    expect(screen.getByTestId('share-card')).toBeOnTheScreen();
  });

  it('공유 시트를 열 수 없으면 안내를 보여 준다', async () => {
    jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(false);
    addSample();
    await openPreview();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '공유하기' }));
      await Promise.resolve();
    });
    expect(alertSpy.mock.calls.at(-1)?.[0]).toBe('공유할 수 없어요');
  });
});
