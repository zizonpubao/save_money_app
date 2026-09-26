import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { BackHandler, Platform, type NativeEventSubscription } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarChart } from '@/src/components/BarChart';
import { EntryForm } from '@/src/components/EntryForm';
import { QuickSaveMenu } from '@/src/components/QuickSaveMenu';
import type { Category } from '@/src/db';
import { backupPickerTypes } from '@/src/features/backupFile';
import { axisDays, buildDailyBars, toDailyChartBars } from '@/src/features/monthlyStats';
import { useEntryForm } from '@/src/features/useEntryForm';
import { useModalInsets } from '@/src/features/useModalInsets';
import { formatKoDate, today } from '@/src/utils/date';

/**
 * Android 전용 분기 (친구 APK 배포 전 코드 점검). jest-expo 기본은 iOS 라 Platform.OS 를 바꿔 끼워 확인한다.
 * BackHandler 는 iOS 구현이 아무것도 안 해서, 등록된 콜백을 가로채 "뒤로 가기" 를 흉내 낸다.
 */
jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: jest.fn(() => null),
  DateTimePickerAndroid: { open: jest.fn(), dismiss: jest.fn() },
}));

const 커피: Category = { id: 1, name: '커피', emoji: '☕', sortOrder: 0, isDefault: true };

function Harness() {
  const form = useEntryForm();
  return <EntryForm form={form} categories={[커피]} />;
}

type BackListener = Parameters<typeof BackHandler.addEventListener>[1];

/** BackHandler.addEventListener 를 가로채 지금 등록돼 있는 콜백 목록을 돌려준다 (remove 하면 빠진다) */
function spyBack() {
  const listeners: BackListener[] = [];
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    listeners.push(handler);
    const sub: NativeEventSubscription = {
      remove: () => {
        const at = listeners.indexOf(handler);
        if (at >= 0) listeners.splice(at, 1);
      },
    };
    return sub;
  });
  /** 가장 나중에 등록된 것부터 불러 true 를 돌려주면 멈춘다 (RN 과 같은 순서) */
  const pressBack = (): boolean => {
    for (const listener of [...listeners].reverse()) if (listener({ type: 'hardwareBackPress', timeStamp: 0 })) return true;
    return false;
  };
  return { listeners, pressBack };
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.mocked(DateTimePickerAndroid.open).mockClear();
  jest.mocked(DateTimePicker).mockClear();
});

describe('Android 대응', () => {
  it('모달 여백: Android 는 상태바·내비 바 inset 을 쓰고, iOS(pageSheet)는 0 이라 헤더가 밀리지 않는다', async () => {
    jest.mocked(useSafeAreaInsets).mockReturnValue({ top: 24, bottom: 48, left: 0, right: 0 });

    jest.replaceProperty(Platform, 'OS', 'android');
    expect((await renderHook(() => useModalInsets())).result.current).toEqual({ top: 24, bottom: 48 });

    jest.replaceProperty(Platform, 'OS', 'ios');
    expect((await renderHook(() => useModalInsets())).result.current).toEqual({ top: 0, bottom: 0 });
  });

  it('날짜: Android 는 행을 누르면 다이얼로그를 명령형으로 한 번 열고, 고르면 날짜가 바뀐다 (컴포넌트는 안 그린다)', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await render(<Harness />);

    await fireEvent.press(screen.getByTestId('date-field'));
    expect(DateTimePickerAndroid.open).toHaveBeenCalledTimes(1);
    expect(DateTimePicker).not.toHaveBeenCalled();

    const params = jest.mocked(DateTimePickerAndroid.open).mock.calls[0][0];
    expect(params.mode).toBe('date');
    expect(params.maximumDate).toBeInstanceOf(Date);

    await act(async () => {
      params.onChange?.({ type: 'set', nativeEvent: { timestamp: 0, utcOffset: 0 } }, new Date(2026, 8, 1));
    });
    expect(screen.getByText(formatKoDate('2026-09-01'))).toBeOnTheScreen();
  });

  it('날짜: Android 다이얼로그를 취소(dismissed)하면 날짜는 그대로다', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await render(<Harness />);

    await fireEvent.press(screen.getByTestId('date-field'));
    const params = jest.mocked(DateTimePickerAndroid.open).mock.calls[0][0];
    await act(async () => {
      params.onChange?.({ type: 'dismissed', nativeEvent: { timestamp: 0, utcOffset: 0 } }, new Date(2020, 0, 1));
    });
    expect(screen.getByText(formatKoDate(today()))).toBeOnTheScreen();
  });

  it('날짜: iOS 는 지금처럼 행 아래 휠을 펼친다 (명령형 다이얼로그 없음)', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByTestId('date-field'));
    expect(DateTimePickerAndroid.open).not.toHaveBeenCalled();
    expect(DateTimePicker).toHaveBeenCalled();
    expect(jest.mocked(DateTimePicker).mock.calls[0][0]).toMatchObject({ display: 'spinner' });
  });

  it('백업 파일 고르기: Android 는 모든 파일(*/*), iOS 는 JSON·텍스트·UTI', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(backupPickerTypes()).toEqual(['*/*']);
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(backupPickerTypes()).toEqual(['application/json', 'text/plain', 'public.json']);
  });

  it('원탭 저장 메뉴: 뒤로 가기는 앱을 나가지 않고 메뉴만 닫고, 메뉴가 사라지면 가로채기를 푼다', async () => {
    const back = spyBack();
    const onClose = jest.fn();
    const { unmount } = await render(
      <QuickSaveMenu
        items={[{ title: '커피', amount: 4500, categoryId: 1 }]}
        categories={[커피]}
        onPick={jest.fn()}
        onClose={onClose}
      />,
    );
    expect(back.pressBack()).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);

    await unmount();
    expect(back.listeners).toHaveLength(0);
  });

  it('막대 그래프: 툴팁이 떠 있을 때만 뒤로 가기가 툴팁을 닫는다', async () => {
    const back = spyBack();
    const month = '2026-01';
    await render(<BarChart bars={toDailyChartBars(buildDailyBars(month, []), axisDays(month))} />);
    expect(back.listeners).toHaveLength(0);

    const track = screen.getByTestId('barchart-track');
    await fireEvent(track, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(screen.getByText('1일 · 0원')).toBeOnTheScreen();
    expect(back.listeners).toHaveLength(1);

    await act(async () => {
      expect(back.pressBack()).toBe(true);
    });
    expect(screen.queryByText('1일 · 0원')).toBeNull();
    expect(back.listeners).toHaveLength(0);
  });
});
