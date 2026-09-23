import { renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { useHomeCard } from '@/src/features/useHomeCard';
import { useEntryStore } from '@/src/store/entryStore';

let mockFocused = true;

// 네비게이터 밖에서 훅을 돌리기 위해 포커스 여부만 대역으로 바꾼다
jest.mock('expo-router', () => ({
  useIsFocused: () => mockFocused,
}));

/** AppState 리스너를 잡아 두고, 테스트가 직접 상태 변화를 흘려보낼 수 있게 한다 */
function captureAppState() {
  let onChange: ((state: AppStateStatus) => void) | undefined;
  const remove = jest.fn();
  const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((type, handler) => {
    if (type === 'change') onChange = handler;
    return { remove };
  });
  return { emit: (state: AppStateStatus) => onChange?.(state), remove, spy };
}

describe('useHomeCard — 앱 복귀 시 첫 오픈 판정', () => {
  beforeEach(() => {
    mockFocused = true;
  });

  it('홈이 포커스일 때 active 로 바뀌면 openHome 을 1번 부르고, 언마운트하면 리스너를 뗀다', async () => {
    const app = captureAppState();
    const openHome = jest.fn();
    useEntryStore.setState({ openHome });

    const { unmount } = await renderHook(() => useHomeCard());

    app.emit('background');
    expect(openHome).not.toHaveBeenCalled();
    app.emit('active');
    expect(openHome).toHaveBeenCalledTimes(1);

    await unmount();
    expect(app.remove).toHaveBeenCalled();
    app.spy.mockRestore();
  });

  it('다른 탭에 있을 때(포커스 아님) active 로 바뀌면 openHome 을 부르지 않는다', async () => {
    mockFocused = false;
    const app = captureAppState();
    const openHome = jest.fn();
    useEntryStore.setState({ openHome });

    const { unmount } = await renderHook(() => useHomeCard());

    app.emit('active');
    expect(openHome).not.toHaveBeenCalled();

    await unmount();
    app.spy.mockRestore();
  });

  it('포커스가 나갔다 돌아오면 그 뒤 active 부터 다시 부른다', async () => {
    const app = captureAppState();
    const openHome = jest.fn();
    useEntryStore.setState({ openHome });

    const { rerender, unmount } = await renderHook(() => useHomeCard());

    mockFocused = false;
    await rerender({});
    app.emit('active');
    expect(openHome).not.toHaveBeenCalled();

    mockFocused = true;
    await rerender({});
    app.emit('active');
    expect(openHome).toHaveBeenCalledTimes(1);

    await unmount();
    app.spy.mockRestore();
  });
});
