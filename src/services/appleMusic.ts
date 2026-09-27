import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchSubscriptionStatus,
  isSubscriptionModuleAvailable,
  SubscriptionStatus,
} from '../../modules/apple-music-subscription';

/**
 * Apple Music 订阅状态的统一门面。
 *
 * 页面层只认这里（getCachedSubscription / subscribeAppleMusic / refreshSubscription），
 * 不直接碰原生模块 —— 将来换实现方式（比如改成第三方 MusicKit 库）只改这一个文件。
 *
 * 状态三态：
 *   subscribed 已订阅 → 不用提示
 *   eligible   未订阅且允许引导 → 提示
 *   unknown    未能确认（真机上多半是没登录 Apple Music）→ 也提示，别放过潜在订阅用户
 */

export type { SubscriptionStatus } from '../../modules/apple-music-subscription';

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  /** MusicKit 授权状态：区分「没登录 Apple Music」(notDetermined) 与「真读不到」 */
  authorizationStatus: 'authorized' | 'denied' | 'restricted' | 'notDetermined' | 'unsupported' | 'unknown';
  canPlayCatalogContent: boolean;
  canBecomeSubscriber: boolean;
  /** 最近一次真实检测的时间戳，0 = 从未成功检测过 */
  updatedAt: number;
  /** 原生返回的原始错误（调试用） */
  error?: string;
}

/** 跳转 Apple Music 订阅页（Apple 会按账号地区重定向，能拉起 Apple Music App） */
export const APPLE_MUSIC_SUBSCRIBE_URL = 'https://music.apple.com/subscribe';

const CACHE_KEY = 'appleMusic.subscription';
const PROMPT_DISMISSED_KEY = 'appleMusic.promptDismissed';
const PROMPT_SHOWN_KEY = 'appleMusic.promptShownCount';
/** 缓存有效期：一天校准一次就够，用户中途订阅/退订还有 AppState 回前台补一次 */
const CACHE_TTL = 24 * 60 * 60 * 1000;

const UNKNOWN: SubscriptionInfo = {
  status: 'unknown',
  authorizationStatus: 'unknown',
  canPlayCatalogContent: false,
  canBecomeSubscriber: false,
  updatedAt: 0,
};

let cached: SubscriptionInfo = UNKNOWN;
let cacheLoaded = false;
let pending: Promise<SubscriptionInfo> | null = null;
const listeners = new Set<(info: SubscriptionInfo) => void>();

async function ensureCacheLoaded(): Promise<void> {
  if (cacheLoaded) return;
  cacheLoaded = true;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as SubscriptionInfo;
    if (parsed && typeof parsed.status === 'string') cached = parsed;
  } catch {
    // 缓存坏了就当没缓存
  }
}

export function getCachedSubscription(): SubscriptionInfo {
  return cached;
}

/** 订阅状态变化（首次会把当前缓存推给订阅者），返回取消订阅函数 */
export function subscribeAppleMusic(listener: (info: SubscriptionInfo) => void): () => void {
  listeners.add(listener);
  listener(cached);
  return () => {
    listeners.delete(listener);
  };
}

function applyInfo(info: SubscriptionInfo): void {
  cached = info;
  listeners.forEach((listener) => listener(info));
}

/**
 * 校准订阅状态。
 * 缓存新鲜（24h 内且状态不是 unknown）时不打原生；并发调用会合并成一次。
 */
export async function refreshSubscription(force = false): Promise<SubscriptionInfo> {
  await ensureCacheLoaded();
  const fresh = cached.updatedAt > 0 && Date.now() - cached.updatedAt < CACHE_TTL;
  if (!force && fresh && cached.status !== 'unknown') return cached;
  if (pending) return pending;

  pending = (async () => {
    const native = await fetchSubscriptionStatus();
    const next: SubscriptionInfo = {
      status: native?.status ?? 'unknown',
      authorizationStatus: native?.authorizationStatus ?? 'unknown',
      canPlayCatalogContent: !!native?.canPlayCatalogContent,
      canBecomeSubscriber: !!native?.canBecomeSubscriber,
      updatedAt: Date.now(),
      error: native?.error,
    };
    applyInfo(next);
    // 调试用：真机可在 设置→隐私→分析与改进 / Xcode 控制台 看到这次检测到的原始状态
    console.log('[AppleMusic] subscription =>', next.status, 'auth=', next.authorizationStatus);
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next));
    } catch {
      // 写不进缓存不影响本次使用
    }
    return next;
  })();

  try {
    return await pending;
  } finally {
    pending = null;
  }
}

/**
 * 是否该弹「去订阅 Apple Music」的提示。
 * 现阶段：已编入原生模块 + 完成过一次检测 + 不是「已确认订阅」→ 就一直显示。
 * （暂不做「最多 N 次 / 手动关闭」限制，方便非会员持续看到订阅入口；
 *   对应的 markSubscribePromptShown / dismissSubscribePrompt 暂时不生效，保留备用。）
 */
export async function shouldShowSubscribePrompt(): Promise<boolean> {
  if (!isSubscriptionModuleAvailable()) return false;
  // 还没完成过一次检测（updatedAt=0）时不提示，避免会员用户开屏闪一下引导条
  if (cached.updatedAt === 0) return false;
  return cached.status !== 'subscribed';
}

/** 提示真的露出来以后计一次，避免无限打扰 */
export async function markSubscribePromptShown(): Promise<void> {
  try {
    const shown = Number(await AsyncStorage.getItem(PROMPT_SHOWN_KEY)) || 0;
    await AsyncStorage.setItem(PROMPT_SHOWN_KEY, String(shown + 1));
  } catch {
    // 忽略
  }
}

/** 用户主动关掉后不再提示 */
export async function dismissSubscribePrompt(): Promise<void> {
  try {
    await AsyncStorage.setItem(PROMPT_DISMISSED_KEY, '1');
  } catch {
    // 忽略
  }
}

/** 打开 Apple Music 订阅页；打不开返回 false，调用方自己兜底提示 */
export async function openAppleMusicSubscribe(): Promise<boolean> {
  try {
    const can = await Linking.canOpenURL(APPLE_MUSIC_SUBSCRIBE_URL);
    if (!can) return false;
    await Linking.openURL(APPLE_MUSIC_SUBSCRIBE_URL);
    return true;
  } catch {
    return false;
  }
}
