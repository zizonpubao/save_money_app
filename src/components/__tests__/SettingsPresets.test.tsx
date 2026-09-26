import { fireEvent, render, screen } from '@testing-library/react-native';

import SettingsScreen from '@/app/(tabs)/settings';
import { EntryFormModal } from '@/src/components/EntryFormModal';
import {
  getSetting,
  initDatabase,
  resetDatabaseConnection,
  setSetting,
  SETTING_KEYS,
} from '@/src/db';
import { AMOUNT_PRESETS } from '@/src/features/amountPresets';
import { useSettingsStore } from '@/src/store/settingsStore';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
}));

const ROW = '빠른 금액 버튼';

function input(index: number) {
  return screen.getByLabelText(`빠른 금액 ${index + 1}번째`);
}

async function openModal() {
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${ROW}`) }));
}

describe('설정 화면 — 입력 · 빠른 금액 버튼', () => {
  beforeEach(() => {
    resetDatabaseConnection();
    initDatabase();
    useSettingsStore.setState({ amountPresets: [...AMOUNT_PRESETS], loaded: false });
  });

  afterAll(() => {
    resetDatabaseConnection();
  });

  it('"입력" 구획에 "빠른 금액 버튼" 행이 있고 값 미리보기는 "5백 · 1천 · 3천 · 5천 · 1만"', async () => {
    await render(<SettingsScreen />);
    expect(screen.getByText('입력')).toBeOnTheScreen();
    expect(screen.getByText(ROW)).toBeOnTheScreen();
    expect(screen.getByText('5백 · 1천 · 3천 · 5천 · 1만')).toBeOnTheScreen();
  });

  it('DB 에 저장한 값이 있으면 그 순서로 미리보기', async () => {
    setSetting(SETTING_KEYS.amountPresets, '[2000,1500,25000,100,1000000]');
    await render(<SettingsScreen />);
    expect(screen.getByText('2천 · 1.5천 · 2.5만 · 1백 · 100만')).toBeOnTheScreen();
  });

  it('모달은 5칸에 지금 값을 콤마로 채우고 숫자 키패드를 쓴다', async () => {
    await render(<SettingsScreen />);
    await openModal();
    expect(AMOUNT_PRESETS.map((_, i) => input(i).props.value)).toEqual([
      '500',
      '1,000',
      '3,000',
      '5,000',
      '10,000',
    ]);
    expect(input(0).props.keyboardType).toBe('number-pad');
    await fireEvent.changeText(input(4), '25000');
    expect(input(4).props.value).toBe('25,000');
    // 칩에 어떻게 보일지 바로 옆에
    expect(screen.getByText('2.5만')).toBeOnTheScreen();
  });

  it('바꾼 값을 저장하면 행 미리보기·스토어·DB 에 바로 반영된다 (정렬하지 않음)', async () => {
    await render(<SettingsScreen />);
    await openModal();
    await fireEvent.changeText(input(0), '20000');
    await fireEvent.changeText(input(4), '700');
    await fireEvent.press(screen.getByText('저장'));
    expect(screen.queryByLabelText('빠른 금액 1번째')).toBeNull();
    expect(screen.getByText('2만 · 1천 · 3천 · 5천 · 7백')).toBeOnTheScreen();
    expect(useSettingsStore.getState().amountPresets).toEqual([20000, 1000, 3000, 5000, 700]);
    expect(getSetting(SETTING_KEYS.amountPresets)).toBe('[20000,1000,3000,5000,700]');
  });

  it('규칙에 어긋나면 저장하지 않고 오류 문구를 보여 준다 (100원 단위 · 중복 · 빈 칸 · 범위)', async () => {
    await render(<SettingsScreen />);
    await openModal();
    // 칸을 벗어나기 전까지는 문구가 없다 (치는 도중 깜빡이지 않게)
    await fireEvent.changeText(input(0), '550');
    expect(screen.queryByTestId('preset-errors')).toBeNull();

    await fireEvent.press(screen.getByText('저장'));
    expect(screen.getByText('100원 단위로 입력해 주세요')).toBeOnTheScreen();
    expect(input(0)).toBeOnTheScreen(); // 모달이 그대로 열려 있다
    expect(getSetting(SETTING_KEYS.amountPresets)).toBeNull();

    await fireEvent.changeText(input(0), '1000');
    expect(screen.queryByText('100원 단위로 입력해 주세요')).toBeNull();
    expect(screen.getByText('같은 금액은 한 번만 넣을 수 있습니다')).toBeOnTheScreen();

    await fireEvent.changeText(input(0), '');
    expect(screen.getByText('금액 5개를 모두 입력해 주세요')).toBeOnTheScreen();

    await fireEvent.changeText(input(0), '2000000');
    expect(screen.getByText('100원부터 1,000,000원까지 입력할 수 있습니다')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('저장'));
    expect(useSettingsStore.getState().amountPresets).toEqual([...AMOUNT_PRESETS]);
  });

  it('칸을 벗어나면(blur) 그때부터 오류 문구가 보인다', async () => {
    await render(<SettingsScreen />);
    await openModal();
    await fireEvent.changeText(input(1), '150');
    await fireEvent(input(1), 'blur');
    expect(screen.getByText('100원 단위로 입력해 주세요')).toBeOnTheScreen();
  });

  it('"기본값으로" 를 누르면 DB 키를 지우고 기본 5개로 돌린 뒤 닫는다', async () => {
    setSetting(SETTING_KEYS.amountPresets, '[100,200,300,400,500]');
    await render(<SettingsScreen />);
    expect(screen.getByText('1백 · 2백 · 3백 · 4백 · 5백')).toBeOnTheScreen();
    await openModal();
    await fireEvent.press(screen.getByText('기본값으로'));
    expect(screen.queryByLabelText('빠른 금액 1번째')).toBeNull();
    expect(screen.getByText('5백 · 1천 · 3천 · 5천 · 1만')).toBeOnTheScreen();
    expect(getSetting(SETTING_KEYS.amountPresets)).toBeNull();
  });

  it('저장한 값이 입력 시트 칩에 그대로 나온다', async () => {
    await render(<SettingsScreen />);
    await openModal();
    await fireEvent.changeText(input(0), '1500');
    await fireEvent.press(screen.getByText('저장'));
    await screen.unmount();

    await render(
      <EntryFormModal visible categories={[]} onSubmit={jest.fn()} onClose={jest.fn()} />,
    );
    expect(screen.getByText('1.5천')).toBeOnTheScreen();
    expect(screen.queryByText('5백')).toBeNull();
    expect(screen.getByLabelText('금액에 1,500원 더하기')).toBeOnTheScreen();
  });
});
