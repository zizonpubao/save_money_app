import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import * as Sharing from 'expo-sharing';
import { Alert, type AlertButton } from 'react-native';

import SettingsScreen from '@/app/(tabs)/settings';
import {
  addCategory,
  addEntry,
  getAllCategories,
  getAllEntries,
  initDatabase,
  resetDatabaseConnection,
} from '@/src/db';
import { useCategoryStore } from '@/src/store/categoryStore';
import { useSettingsStore } from '@/src/store/settingsStore';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
}));

const alertSpy = jest.spyOn(Alert, 'alert');

function lastAlert(): { title: string; message?: string; buttons: AlertButton[] } {
  const call = alertSpy.mock.calls.at(-1);
  if (!call) throw new Error('알림이 없습니다');
  return { title: call[0], message: call[1], buttons: call[2] ?? [] };
}

function rowNames(): string[] {
  return screen.getAllByTestId('category-row').map((row) => {
    const label = within(row).getAllByRole('button')[0]?.props.accessibilityLabel as string;
    return label.replace(/ 편집$/, '');
  });
}

describe('설정 화면 — M5 백업 · 카테고리 · 앱 정보', () => {
  beforeEach(() => {
    resetDatabaseConnection();
    initDatabase();
    useSettingsStore.setState({ monthlyGoal: null, loaded: false });
    useCategoryStore.setState({ categories: [], loaded: false });
    alertSpy.mockClear();
    alertSpy.mockImplementation(() => undefined);
    jest.mocked(Sharing.shareAsync).mockClear();
  });

  afterAll(() => {
    alertSpy.mockRestore();
    resetDatabaseConnection();
  });

  it('구획은 목표 · 효과 · 백업 · 카테고리 · 앱 정보 순서', async () => {
    await render(<SettingsScreen />);
    const titles = ['목표', '효과', '백업', '카테고리', '앱 정보'];
    for (const title of titles) expect(screen.getByText(title)).toBeOnTheScreen();
    expect(screen.getByText('JSON 으로 내보내기')).toBeOnTheScreen();
    expect(screen.getByText('JSON 에서 복원')).toBeOnTheScreen();
    expect(screen.getByText('CSV 로 내보내기')).toBeOnTheScreen();
    expect(screen.getByText('버전')).toBeOnTheScreen();
    expect(screen.getByText('데이터 전체 삭제')).toBeOnTheScreen();
  });

  it('"JSON 으로 내보내기" 를 누르면 공유 시트가 열린다', async () => {
    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByText('JSON 으로 내보내기'));
    expect(Sharing.shareAsync).toHaveBeenCalledTimes(1);
  });

  it('"데이터 전체 삭제" 는 먼저 백업을 권하는 1단계 알림', async () => {
    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByText('데이터 전체 삭제'));
    expect(lastAlert().title).toBe('데이터 전체 삭제');
    expect(lastAlert().buttons.map((b) => b.text)).toContain('백업하기');
  });

  describe('카테고리', () => {
    it('기본 9개가 이모지·이름·"기본" 표시와 함께 순서대로, 맨 위 ↑·맨 아래 ↓ 는 비활성', async () => {
      await render(<SettingsScreen />);
      expect(rowNames()).toEqual(['커피', '밥값', '배달', '택시', '쇼핑', '술', '간식', '구독', '기타']);
      expect(screen.getAllByText('기본')).toHaveLength(9);
      expect(screen.getByLabelText('커피 위로')).toBeDisabled();
      expect(screen.getByLabelText('기타 아래로')).toBeDisabled();
      expect(screen.getByLabelText('커피 아래로')).toBeEnabled();
    });

    it('화살표로 순서를 바꾸면 화면과 DB 가 함께 바뀐다', async () => {
      await render(<SettingsScreen />);
      await fireEvent.press(screen.getByLabelText('밥값 위로'));
      expect(rowNames().slice(0, 3)).toEqual(['밥값', '커피', '배달']);
      await fireEvent.press(screen.getByLabelText('기타 위로'));
      expect(rowNames().slice(-2)).toEqual(['기타', '구독']);
      expect(getAllCategories().map((c) => c.name).slice(0, 2)).toEqual(['밥값', '커피']);
    });

    it('"카테고리 추가" → 이모지·이름 입력 → 저장하면 맨 아래에 생긴다 (기본 표시 없음)', async () => {
      await render(<SettingsScreen />);
      await fireEvent.press(screen.getByText('카테고리 추가'));
      expect(screen.getByTestId('category-modal')).toBeOnTheScreen();
      expect(screen.getAllByText('카테고리 추가')).toHaveLength(2); // 행 + 모달 제목
      const save = screen.getByLabelText('카테고리 저장');
      expect(save).toBeDisabled();

      await fireEvent.changeText(screen.getByLabelText('카테고리 이모지'), '🏪');
      await fireEvent.changeText(screen.getByLabelText('카테고리 이름'), '편의점');
      expect(screen.getByLabelText('카테고리 저장')).toBeEnabled();
      await fireEvent.press(screen.getByLabelText('카테고리 저장'));

      expect(screen.queryByTestId('category-modal')).toBeNull();
      expect(rowNames().at(-1)).toBe('편의점');
      expect(screen.getAllByText('기본')).toHaveLength(9);
      expect(getAllCategories().at(-1)).toMatchObject({ name: '편의점', emoji: '🏪', isDefault: false });
    });

    it('이모지가 3자 이상이면 안내 문구와 함께 저장 버튼이 비활성', async () => {
      await render(<SettingsScreen />);
      await fireEvent.press(screen.getByText('카테고리 추가'));
      await fireEvent.changeText(screen.getByLabelText('카테고리 이모지'), '☕🍰🍺');
      await fireEvent.changeText(screen.getByLabelText('카테고리 이름'), '디저트');
      expect(screen.getByText('이모지는 2자까지 쓸 수 있습니다')).toBeOnTheScreen();
      expect(screen.getByLabelText('카테고리 저장')).toBeDisabled();
    });

    it('이미 있는 이름이면 알림을 띄우고 모달은 열어 둔다', async () => {
      await render(<SettingsScreen />);
      await fireEvent.press(screen.getByText('카테고리 추가'));
      await fireEvent.changeText(screen.getByLabelText('카테고리 이모지'), '🥤');
      await fireEvent.changeText(screen.getByLabelText('카테고리 이름'), '커피');
      await fireEvent.press(screen.getByLabelText('카테고리 저장'));
      expect(lastAlert().title).toBe('이미 있는 이름입니다');
      expect(screen.getByTestId('category-modal')).toBeOnTheScreen();
      expect(getAllCategories()).toHaveLength(9);
    });

    it('기본 카테고리 편집: 이름·이모지는 바뀌고 삭제 버튼은 비활성 + 안내', async () => {
      await render(<SettingsScreen />);
      await fireEvent.press(screen.getByLabelText('커피 편집'));
      expect(screen.getByText('카테고리 편집')).toBeOnTheScreen();
      expect(screen.getByLabelText('카테고리 이름').props.value).toBe('커피');
      expect(screen.getByLabelText('카테고리 삭제')).toBeDisabled();
      expect(screen.getByText(/기본 카테고리는 삭제할 수 없습니다/)).toBeOnTheScreen();

      await fireEvent.changeText(screen.getByLabelText('카테고리 이름'), '카페');
      await fireEvent.press(screen.getByLabelText('카테고리 저장'));
      expect(rowNames()[0]).toBe('카페');
      expect(getAllCategories()[0]).toMatchObject({ name: '카페', isDefault: true });
    });

    it('사용 중인 카테고리 삭제: "기록 N건이 미분류가 됩니다" 경고 → 삭제하면 행이 사라지고 기록은 남는다', async () => {
      const store = addCategory({ name: '편의점', emoji: '🏪' });
      for (const title of ['삼각김밥', '컵라면']) {
        addEntry({ date: '2026-09-01', title, amount: 1500, categoryId: store.id, memo: null });
      }
      await render(<SettingsScreen />);
      await fireEvent.press(screen.getByLabelText('편의점 편집'));
      expect(screen.getByLabelText('카테고리 삭제')).toBeEnabled();
      await fireEvent.press(screen.getByLabelText('카테고리 삭제'));

      expect(lastAlert().title).toBe('🏪 편의점 삭제');
      expect(lastAlert().message).toBe('기록 2건이 미분류가 됩니다. 기록은 지워지지 않습니다.');
      const confirm = lastAlert().buttons.find((b) => b.text === '삭제');
      expect(confirm?.style).toBe('destructive');
      await act(async () => confirm?.onPress?.());

      expect(screen.queryByTestId('category-modal')).toBeNull();
      expect(rowNames()).not.toContain('편의점');
      expect(getAllEntries().map((e) => e.categoryId)).toEqual([null, null]);
    });

    it('쓰는 기록이 없으면 그렇게 알린다', async () => {
      addCategory({ name: '편의점', emoji: '🏪' });
      await render(<SettingsScreen />);
      await fireEvent.press(screen.getByLabelText('편의점 편집'));
      await fireEvent.press(screen.getByLabelText('카테고리 삭제'));
      expect(lastAlert().message).toBe('이 카테고리를 쓰는 기록은 없습니다.');
    });
  });
});
