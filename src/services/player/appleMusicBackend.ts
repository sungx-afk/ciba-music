import { getCachedSubscription } from '../appleMusic';
import { PlayerBackend, PlayerTrack, StateEmitter } from './types';
import {
  PlaybackListenerHandle,
  addPlaybackListener,
  isPlayerAvailable,
  pause as pauseNative,
  playSong,
  resume as resumeNative,
  seek as seekNative,
  stop as stopNative,
} from '../../../modules/apple-music-player';

/**
 * Apple Music 全曲播放源（方案 B）。
 *
 * 前提：已订阅 Apple Music（canPlayCatalogContent）+ 这首歌有 catalog id（track.appleId）。
 * 不满足时 isAvailable 返回 false，musicPlayer 会自动退回 previewBackend 播试听片段。
 * 上层 PlayerScreen 不用改，它只认 PlayerBackend 接口。
 */

/** 方案 B 的总开关 */
export const APPLE_MUSIC_PLAYBACK_ENABLED = true;

let statusHandle: PlaybackListenerHandle | null = null;

function clearListener(): void {
  if (statusHandle) {
    statusHandle.remove();
    statusHandle = null;
  }
}

export const appleMusicBackend: PlayerBackend = {
  kind: 'appleMusic',

  async isAvailable(track: PlayerTrack) {
    if (!APPLE_MUSIC_PLAYBACK_ENABLED) return false;
    // 全曲播放的前提：已订阅 Apple Music + 这首歌有 catalog id + 原生模块可用
    if (!track.appleId) return false;
    if (!isPlayerAvailable()) return false;
    return getCachedSubscription().status === 'subscribed';
  },

  async load(track: PlayerTrack, emit: StateEmitter, onFinish: () => void) {
    clearListener();
    if (!track.appleId) {
      emit({ loading: false, error: '这首歌没有 Apple Music 标识，无法播放全曲' });
      return;
    }

    emit({ loading: true, playing: false, position: 0, error: '' });

    try {
      const result = await playSong(track.appleId);
      if (result?.duration) emit({ duration: Math.round(result.duration * 1000) });

      statusHandle = addPlaybackListener((event) => {
        emit({
          playing: event.status === 'playing',
          position: Math.round((event.position || 0) * 1000),
          loading: false,
        });
        if (event.duration) emit({ duration: Math.round(event.duration * 1000) });
        if (event.finished) {
          emit({ playing: false });
          onFinish();
        }
      });
    } catch (e: any) {
      emit({ loading: false, error: e?.message || 'Apple Music 播放失败' });
    }
  },

  async play() {
    await resumeNative();
  },

  async pause() {
    await pauseNative();
  },

  async seek(ms: number) {
    await seekNative(Math.max(0, ms) / 1000);
  },

  async stop() {
    clearListener();
    try {
      await stopNative();
    } catch {
      // 停止失败也继续，避免卡住切歌流程
    }
  },
};
