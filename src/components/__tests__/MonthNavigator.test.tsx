import { fireEvent, render, screen } from '@testing-library/react-native';

import { MonthNavigator } from '@/src/components/MonthNavigator';

async function renderNav(canPrev: boolean, canNext: boolean) {
  const onPrev = jest.fn();
  const onNext = jest.fn();
  await render(
    <MonthNavigator
      period="2026-09"
      canPrev={canPrev}
      canNext={canNext}
      onPrev={onPrev}
      onNext={onNext}
    />,
  );
  return { onPrev, onNext };
}

describe('MonthNavigator (월 이동)', () => {
  it('가운데에 "2026년 9월" 을 보여준다', async () => {
    await renderNav(true, true);
    expect(screen.getByText('2026년 9월')).toBeOnTheScreen();
  });

  it('canPrev 가 false 면 이전 달 버튼이 비활성이고 눌러도 콜백이 없다', async () => {
    const { onPrev } = await renderNav(false, true);
    expect(screen.getByLabelText('이전 달')).toBeDisabled();
    await fireEvent.press(screen.getByLabelText('이전 달'));
    expect(onPrev).not.toHaveBeenCalled();
  });

  it('canNext 가 false 면 다음 달 버튼이 비활성이고 눌러도 콜백이 없다', async () => {
    const { onNext } = await renderNav(true, false);
    expect(screen.getByLabelText('다음 달')).toBeDisabled();
    await fireEvent.press(screen.getByLabelText('다음 달'));
    expect(onNext).not.toHaveBeenCalled();
  });

  it('둘 다 가능하면 버튼이 켜져 있고 누르면 각 콜백이 한 번씩 불린다', async () => {
    const { onPrev, onNext } = await renderNav(true, true);
    expect(screen.getByLabelText('이전 달')).toBeEnabled();
    await fireEvent.press(screen.getByLabelText('이전 달'));
    await fireEvent.press(screen.getByLabelText('다음 달'));
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});

describe('MonthNavigator (년 모드)', () => {
  it('가운데에 "2026년" 을 보여주고 화살표 라벨이 "이전 해 / 다음 해" 다', async () => {
    await render(
      <MonthNavigator
        period="2026"
        mode="year"
        canPrev
        canNext={false}
        onPrev={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    expect(screen.getByText('2026년')).toBeOnTheScreen();
    expect(screen.getByLabelText('이전 해')).toBeEnabled();
    expect(screen.getByLabelText('다음 해')).toBeDisabled();
  });
});
