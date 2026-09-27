import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  SubscriptionInfo,
  getCachedSubscription,
  refreshSubscription,
  subscribeAppleMusic,
} from '../services/appleMusic';

/**
 * 在组件里用订阅状态：挂载时校准一次（有缓存就不打原生），
 * App 回到前台再校准一次（用户可能刚在 Apple Music 里订阅/退订）。
 */
export function useAppleMusicSubscription(): SubscriptionInfo {
  const [info, setInfo] = useState<SubscriptionInfo>(() => getCachedSubscription());

  useEffect(() => {
    let alive = true;
    const unsubscribe = subscribeAppleMusic((next) => {
      if (alive) setInfo(next);
    });
    void refreshSubscription();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshSubscription(true);
    });

    return () => {
      alive = false;
      unsubscribe();
      sub.remove();
    };
  }, []);

  return info;
}
