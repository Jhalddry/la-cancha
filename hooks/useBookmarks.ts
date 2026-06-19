import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = '@la_cancha/bookmarks_v1';

export function useBookmarks() {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    void AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setIds(new Set(JSON.parse(raw) as string[]));
    });
  }, []);

  const toggle = useCallback((id: string) => {
    setIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      void AsyncStorage.setItem(KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isBookmarked = useCallback((id: string) => ids.has(id), [ids]);

  return { toggle, isBookmarked };
}
