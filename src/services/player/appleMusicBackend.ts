import { getCachedSubscription } from '../appleMusic';
import { PlayerBackend, PlayerTrack } from './types';

/**
 * Apple Music 全曲播放源（方案 B）。
 *
 * 现在只是占位：开关关着，isAvailable 一律 false，所有歌继续走 preview。
 * 接通时只需要：
 *   1. 把 APPLE_MUSIC_PLAYBACK_ENABLED 置为 true（或接远程配置）
 *   2. 实现下面这些方法（MusicAuthorization + ApplicationMusicPlayer）
 * 上层 PlayerScreen 不用改，它只认 PlayerBackend 接口。
 */

/** 方案 B 的总开关 */
export const APPLE_MUSIC_PLAYBACK_ENABLED = false;

export const appleMusicBackend: PlayerBackend = {
  kind: 'appleMusic',

  async isAvailable(track: PlayerTrack) {
    if (!APPLE_MUSIC_PLAYBACK_ENABLED) return false;
    // 全曲播放的前提：已订阅 Apple Music + 这首歌有 catalog id
    if (!track.appleId) return false;
    return getCachedSubscription()?.status === 'subscribed';
  },

  async load() {
    throw new Error('Apple Music 全曲播放尚未接入（方案 B）');
  },

  async play() {},
  async pause() {},
  async seek() {},
  async stop() {},
};
