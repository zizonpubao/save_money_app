import { useCallback, useState } from 'react';

import { getEntryById, type Entry, type EntryInput } from '@/src/db';
import { useEntryStore } from '@/src/store/entryStore';

/**
 * 수정 화면 로직. 목록 범위 밖(예: 작년) 기록도 열 수 있도록 스토어가 아니라 DB에서 직접 읽는다.
 * id 가 잘못됐으면 entry 는 null.
 */
export function useEntryEditor(idParam: string | undefined) {
  const id = Number.parseInt(idParam ?? '', 10);
  const [entry] = useState<Entry | null>(() => (Number.isInteger(id) ? getEntryById(id) : null));
  const update = useEntryStore((s) => s.update);
  const remove = useEntryStore((s) => s.remove);

  const save = useCallback(
    (input: EntryInput) => {
      if (!entry) return null;
      return update(entry.id, input);
    },
    [entry, update],
  );

  const destroy = useCallback(() => {
    if (!entry) return;
    remove(entry.id);
  }, [entry, remove]);

  return { entry, save, destroy };
}
