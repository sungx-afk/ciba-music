import { requireNativeModule } from 'expo';

/**
 * Apple Music 订阅状态原生模块的 JS 入口。
 *
 * 只在 iOS 真机上可用：Expo Go、安卓、或者没把原生模块编进去的包，
 * requireNativeModule 会抛错，这里统一降级成「不支持」（status = unknown），
 * 上层因此不会弹任何提示，功能不受影响。
 */

export type SubscriptionStatus = 'subscribed' | 'eligible' | 'unknown';

export interface NativeSubscriptionStatus {
  status: SubscriptionStatus;
  canPlayCatalogContent: boolean;
  canBecomeSubscriber: boolean;
  hasCloudLibraryEnabled?: boolean;
  error?: string;
}

let resolved: any | null | undefined;

function nativeModule(): any | null {
  if (resolved === undefined) {
    try {
      resolved = requireNativeModule('AppleMusicSubscription');
    } catch {
      resolved = null;
    }
  }
  return resolved ?? null;
}

/** 原生模块是否可用（iOS + 已打进包） */
export function isSubscriptionModuleAvailable(): boolean {
  return !!nativeModule()?.getSubscriptionStatus;
}

/** 读订阅状态；拿不到返回 null（不是抛错，上层当 unknown 处理） */
export async function fetchSubscriptionStatus(): Promise<NativeSubscriptionStatus | null> {
  const mod = nativeModule();
  if (!mod?.getSubscriptionStatus) return null;
  try {
    const raw = await mod.getSubscriptionStatus();
    if (!raw || typeof raw !== 'object') return null;
    const status: SubscriptionStatus =
      raw.status === 'subscribed' || raw.status === 'eligible' ? raw.status : 'unknown';
    return {
      status,
      canPlayCatalogContent: !!raw.canPlayCatalogContent,
      canBecomeSubscriber: !!raw.canBecomeSubscriber,
      hasCloudLibraryEnabled: !!raw.hasCloudLibraryEnabled,
      error: raw.error ? String(raw.error) : undefined,
    };
  } catch (e: any) {
    return {
      status: 'unknown',
      canPlayCatalogContent: false,
      canBecomeSubscriber: false,
      error: e?.message,
    };
  }
}
