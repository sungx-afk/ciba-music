import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  RecentPlayItem,
  accountIdOf,
  clearRecentPlays,
  getRecentPlays,
  subscribeRecentPlays,
} from '../services/recentPlays';

/**
 * 首页「最近播放」数据源：读当前账号的记录，并在播放页写入后自动刷新。
 * 切换账号（accountId 变化）会重新读该账号的分区。
 */
export function useRecentPlays() {
  const { user } = useAuth();
  const accountId = accountIdOf(user);
  const [items, setItems] = useState<RecentPlayItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const list = await getRecentPlays(accountId);
    setItems(list);
    setLoading(false);
  }, [accountId]);

  useEffect(() => {
    void reload();
    return subscribeRecentPlays(() => {
      void reload();
    });
  }, [reload]);

  const clear = useCallback(async () => {
    await clearRecentPlays(accountId);
  }, [accountId]);

  return { items, loading, clear };
}
