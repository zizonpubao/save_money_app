import { Alert } from 'react-native';

import {
  addCategory,
  CategoryNameTakenError,
  countEntriesInCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
  type Category,
  type CategoryInput,
} from '@/src/db';
import { useCategoryStore } from '@/src/store/categoryStore';
import { useEntryStore } from '@/src/store/entryStore';

import { moveItem } from './categoryForm';

/**
 * (M5) 설정 탭 "카테고리" 구획의 동작. 쿼리 → 스토어 갱신 → 실패 알림을 한곳에 모은다.
 * 카테고리가 바뀌면 홈 목록·이모지 줄의 이모지도 바뀌므로 기록 스토어도 다시 읽는다.
 */

function refresh(): void {
  useCategoryStore.getState().reload();
  useEntryStore.getState().reload();
}

/** 추가(editingId = null) 또는 수정. 성공하면 true (모달을 닫는다) */
export function saveCategory(editingId: number | null, input: CategoryInput): boolean {
  try {
    if (editingId === null) addCategory(input);
    else updateCategory(editingId, input);
  } catch (e) {
    if (e instanceof CategoryNameTakenError) {
      Alert.alert('이미 있는 이름입니다', `"${input.name.trim()}" 카테고리가 이미 있습니다. 다른 이름을 써 주세요.`);
    } else {
      Alert.alert('저장 실패', '잠시 후 다시 시도해 주세요.');
    }
    return false;
  }
  refresh();
  return true;
}

/** 위(−1)·아래(+1) 화살표. 옆 칸과 자리를 바꾸고 전체 순서를 다시 저장한다 */
export function moveCategory(categories: readonly Category[], index: number, delta: -1 | 1): void {
  const ids = moveItem(
    categories.map((c) => c.id),
    index,
    delta,
  );
  try {
    reorderCategories(ids);
  } catch {
    Alert.alert('순서 변경 실패', '잠시 후 다시 시도해 주세요.');
    return;
  }
  refresh();
}

/** 삭제 전 경고 문구. 쓰는 기록이 있으면 몇 건이 미분류가 되는지 알린다 */
export function deleteWarning(count: number): string {
  return count > 0
    ? `기록 ${count}건이 미분류가 됩니다. 기록은 지워지지 않습니다.`
    : '이 카테고리를 쓰는 기록은 없습니다.';
}

/** 삭제 확인 → 삭제. 기본 카테고리는 막는다 (화면도 버튼을 비활성으로 둔다) */
export function requestDeleteCategory(category: Category, onDeleted: () => void): void {
  if (category.isDefault) {
    Alert.alert('삭제할 수 없습니다', '기본 카테고리는 삭제할 수 없습니다. 이름과 이모지는 바꿀 수 있습니다.');
    return;
  }
  let count: number;
  try {
    count = countEntriesInCategory(category.id);
  } catch {
    Alert.alert('삭제 실패', '잠시 후 다시 시도해 주세요.');
    return;
  }
  Alert.alert(`${category.emoji} ${category.name} 삭제`, deleteWarning(count), [
    { text: '취소', style: 'cancel' },
    {
      text: '삭제',
      style: 'destructive',
      onPress: () => {
        try {
          deleteCategory(category.id);
        } catch {
          Alert.alert('삭제 실패', '잠시 후 다시 시도해 주세요.');
          return;
        }
        refresh();
        onDeleted();
      },
    },
  ]);
}
