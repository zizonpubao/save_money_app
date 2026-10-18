import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import type * as AudioMock from '@/__mocks__/expo-audio';
import { EntryForm } from '@/src/components/EntryForm';
import type { Category, RecentTitle } from '@/src/db';
import { AMOUNT_PRESETS } from '@/src/features/amountPresets';
import { useEntryForm } from '@/src/features/useEntryForm';
import { resetTapSoundsForTest, TAP_SOUND_FILES } from '@/src/features/useTapSound';
import { useSettingsStore } from '@/src/store/settingsStore';
import { setHapticsEnabled } from '@/src/utils/haptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Soft: 'soft', Rigid: 'rigid', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
}));

// jest 는 모든 에셋을 같은 값(1)으로 바꾸므로, 어느 파일을 재생했는지 가리려고 파일마다 다른 id 를 준다
jest.mock('../../../assets/sounds/coin-classic.wav', () => 201);
jest.mock('../../../assets/sounds/coin-spin.wav', () => 205);
jest.mock('../../../assets/sounds/coin-low.wav', () => 202);
jest.mock('../../../assets/sounds/toggle.wav', () => 203);
jest.mock('../../../assets/sounds/pop.wav', () => 204);

const { mockPlayers } = jest.requireMock<typeof AudioMock>('expo-audio');

const 커피: Category = { id: 1, name: '커피', emoji: '☕', sortOrder: 0, isDefault: true };
const 택시: Category = { id: 2, name: '택시', emoji: '🚕', sortOrder: 1, isDefault: true };
const RECENT: RecentTitle[] = [{ title: '아메리카노', categoryId: 1, amount: 4500 }];

const AMOUNT = '0'; // 금액 입력 placeholder

function Harness() {
  const form = useEntryForm();
  return <EntryForm form={form} categories={[커피, 택시]} recent={RECENT} />;
}

/** 재생한 타격음 파일 이름들 (누른 순서). 동전은 설정에 따라 coinClassic / coinSpin */
function soundsPlayed(): string[] {
  const names = Object.entries(TAP_SOUND_FILES);
  return mockPlayers
    .flatMap((p) =>
      p.play.mock.invocationCallOrder.map((order) => ({
        order,
        name: names.find(([, id]) => id === p.source)?.[0] ?? '?',
      })),
    )
    .sort((a, b) => a.order - b.order)
    .map((c) => c.name);
}

/** 울린 햅틱 (impact 는 세기, selection 은 'selection') */
function hapticsFired(): string[] {
  const calls: { order: number; kind: string }[] = [];
  const collect = (mock: jest.Mock, kind: (args: unknown[]) => string) =>
    mock.mock.calls.forEach((args, i) =>
      calls.push({ order: mock.mock.invocationCallOrder[i] ?? 0, kind: kind(args) }),
    );
  collect(jest.mocked(Haptics.impactAsync), (args) => String(args[0]));
  collect(jest.mocked(Haptics.selectionAsync), () => 'selection');
  return calls.sort((a, b) => a.order - b.order).map((c) => c.kind);
}

/** 다섯 동작을 한 번씩: + 금액 칩 → 전환 → − 금액 칩 → 카테고리 → 최근 항목 */
async function pressAllFive() {
  await fireEvent.press(screen.getByText('1천'));
  await fireEvent.press(screen.getByTestId('preset-sign-chip'));
  await fireEvent.press(screen.getByText('5백'));
  await fireEvent.press(screen.getByText('☕ 커피'));
  await fireEvent.press(screen.getByLabelText('아메리카노 4,500원 채우기'));
}

describe('입력 버튼 타격감 (소리 + 햅틱)', () => {
  beforeEach(() => {
    resetTapSoundsForTest();
    mockPlayers.length = 0;
    jest.mocked(Haptics.impactAsync).mockClear();
    jest.mocked(Haptics.selectionAsync).mockClear();
    useSettingsStore.setState({ soundEnabled: true, coinSound: 'classic', amountPresets: [...AMOUNT_PRESETS] });
    setHapticsEnabled(true);
  });
  afterAll(() => setHapticsEnabled(true));

  it('+ 모드 금액 칩: 동전 "짤랑"(기본 coinClassic) + Rigid', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByText('1천'));
    expect(soundsPlayed()).toEqual(['coinClassic']);
    expect(hapticsFired()).toEqual(['rigid']);
    expect(screen.getByPlaceholderText(AMOUNT)).toHaveDisplayValue('1,000');
  });

  it('+/− 전환: "딸깍"(toggle) + Light. − 모드 금액 칩은 낮은 "툭"(coinLow) + Soft', async () => {
    await render(<Harness />);
    await fireEvent.changeText(screen.getByPlaceholderText(AMOUNT), '5000');
    await fireEvent.press(screen.getByTestId('preset-sign-chip'));
    expect(soundsPlayed()).toEqual(['toggle']);
    expect(hapticsFired()).toEqual(['light']);
    await fireEvent.press(screen.getByText('1천'));
    expect(soundsPlayed()).toEqual(['toggle', 'coinLow']);
    expect(hapticsFired()).toEqual(['light', 'soft']);
    expect(screen.getByPlaceholderText(AMOUNT)).toHaveDisplayValue('4,000');
    // 다시 + 로 돌리면 금액 칩은 동전 · Rigid
    await fireEvent.press(screen.getByTestId('preset-sign-chip'));
    await fireEvent.press(screen.getByText('5백'));
    expect(soundsPlayed()).toEqual(['toggle', 'coinLow', 'toggle', 'coinClassic']);
    expect(hapticsFired()).toEqual(['light', 'soft', 'light', 'rigid']);
  });

  it('카테고리 칩: 가벼운 "톡"(pop) + Light. 동전 소리와 다른 파일', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByText('🚕 택시'));
    expect(soundsPlayed()).toEqual(['pop']);
    expect(hapticsFired()).toEqual(['light']);
    expect(TAP_SOUND_FILES.pop).not.toBe(TAP_SOUND_FILES.coinClassic);
  });

  it('최근 항목 칩: 동전 "짤랑"(기본 coinClassic) + Rigid, 금액이 채워진다', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByLabelText('아메리카노 4,500원 채우기'));
    expect(soundsPlayed()).toEqual(['coinClassic']);
    expect(hapticsFired()).toEqual(['rigid']);
    expect(screen.getByPlaceholderText(AMOUNT)).toHaveDisplayValue('4,500');
  });

  it('금액 칩 연타: 동전 플레이어 3개를 번갈아 쓰고, 누를 때마다 Rigid', async () => {
    await render(<Harness />);
    for (let i = 0; i < 4; i += 1) await fireEvent.press(screen.getByText('5백'));
    const coins = mockPlayers.filter((p) => p.source === TAP_SOUND_FILES.coinClassic);
    expect(coins.map((p) => p.play.mock.calls.length)).toEqual([2, 1, 1]);
    expect(hapticsFired()).toEqual(['rigid', 'rigid', 'rigid', 'rigid']);
    expect(screen.getByPlaceholderText(AMOUNT)).toHaveDisplayValue('2,000');
  });

  it('효과음을 끄면 다섯 동작 모두 소리 없이 햅틱만 난다', async () => {
    useSettingsStore.setState({ soundEnabled: false });
    await render(<Harness />);
    await pressAllFive();
    expect(soundsPlayed()).toEqual([]);
    expect(hapticsFired()).toEqual(['rigid', 'light', 'soft', 'light', 'rigid']);
  });

  it('햅틱을 끄면 다섯 동작 모두 햅틱 없이 소리만 난다', async () => {
    setHapticsEnabled(false);
    await render(<Harness />);
    await pressAllFive();
    expect(hapticsFired()).toEqual([]);
    expect(soundsPlayed()).toEqual(['coinClassic', 'toggle', 'coinLow', 'pop', 'coinClassic']);
  });

  it('설정에서 동전 소리를 "빙글"(spin)로 고르면 + 금액 칩·최근 항목 칩이 그 녹음을 쓴다. − 모드 툭은 그대로', async () => {
    useSettingsStore.setState({ coinSound: 'spin' });
    await render(<Harness />);
    await pressAllFive();
    expect(soundsPlayed()).toEqual(['coinSpin', 'toggle', 'coinLow', 'pop', 'coinSpin']);
    expect(hapticsFired()).toEqual(['rigid', 'light', 'soft', 'light', 'rigid']);
  });

  it('입력 버튼은 예전 selection 햅틱을 더 쓰지 않는다', async () => {
    await render(<Harness />);
    await pressAllFive();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });
});

describe('금액 숫자 키패드', () => {
  it('키패드 위 버튼은 RN 기본값 영어 "Done" 대신 "완료" 다 (TestFlight 빌드 6에서 발견)', async () => {
    await render(<Harness />);
    expect(screen.getByPlaceholderText('0').props.inputAccessoryViewButtonLabel).toBe('완료');
  });
});
