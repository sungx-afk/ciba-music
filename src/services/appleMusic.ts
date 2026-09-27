import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchSubscriptionStatus, SubscriptionStatus } from '../../modules/apple-music-subscription';

/**
 * Apple Music 订阅状态的统一门面。
 *
 * 页面层只认这里（getCachedSubscription / subscribeAppleMusic / refreshSubscription），
 * 不直接碰原生模块 —— 将来换实现方式（比如改成第三方 MusicKit 库）只改这一个文件。
 *
 * 状态三态：
 *   subscribed 已订阅 → 不用提示
 *   eligible   未订阅且允许引导 → 可以提示
 *   unknown    读不到（安卓 / Expo Go / 没登录 Apple Music / 模拟器）→ 一律不提示
 */

export type { SubscriptionStatus } from '../../modules/apple-music-subscription';

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  canPlayCatalogContent: boolean;
  canBecomeSubscriber: boolean;
  /** 最近一次真实检测的时间戳，0 = 从未成功检测过 */
  updatedAt: number;
}

/** 跳转 Apple Music 订阅页（Apple 会按账号地区重定向，能拉起 Apple Music App） */
export const APPLE_MUSIC_SUBSCRIBE_URL = 'https://music.apple.com/subscribe';

const CACHE_KEY = 'appleMusic.subscription';
const PROMPT_DISMISSED_KEY = 'appleMusic.promptDismissed';
const PROMPT_SHOWN_KEY = 'appleMusic.promptShownCount';
/** 缓存有效期：一天校准一次就够，用户中途订阅/退订还有 AppState 回前台补一次 */
const CACHE_TTL = 24 * 60 * 60 * 1000;
/** 提示最多出现几次（超过就不再打扰） */
const MAX_PROMPT = 2;

const UNKNOWN: SubscriptionInfo = {
  status: 'unknown',
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
      canPlayCatalogContent: !!native?.canPlayCatalogContent,
      canBecomeSubscriber: !!native?.canBecomeSubscriber,
      updatedAt: Date.now(),
    };
    applyInfo(next);
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

/** 是否该弹「去订阅 Apple Music」的提示：仅未订阅 + 没被永久关闭 + 次数没用完 */
export async function shouldShowSubscribePrompt(): Promise<boolean> {
  if (cached.status !== 'eligible') return false;
  try {
    const [dismissed, shown] = await Promise.all([
      AsyncStorage.getItem(PROMPT_DISMISSED_KEY),
      AsyncStorage.getItem(PROMPT_SHOWN_KEY),
    ]);
    if (dismissed === '1') return false;
    return (Number(shown) || 0) < MAX_PROMPT;
  } catch {
    return false;
  }
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
