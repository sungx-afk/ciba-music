import { EventEmitter, requireNativeModule } from 'expo';

/**
 * Apple Music 全曲播放原生模块（MusicKit ApplicationMusicPlayer）的 JS 入口。
 *
 * 只在 iOS 真机上可用：Expo Go、安卓、或没把原生模块编进去的包，requireNativeModule 会抛错，
 * 这里统一降级成「不可用」，上层 appleMusicBackend 会退回试听片段。
 */

export interface PlaybackStatusEvent {
  /** 播放状态 */
  status: 'playing' | 'paused' | 'stopped' | 'interrupted' | 'unknown';
  /** 已播秒数（整首歌时间轴） */
  position: number;
  /** 整首歌时长（秒） */
  duration: number;
  /** 自然播放结束（区别于用户手动 stop） */
  finished?: boolean;
}

export interface PlaybackListenerHandle {
  remove(): void;
}

let resolved: any | null | undefined;

function nativeModule(): any | null {
  if (resolved === undefined) {
    try {
      resolved = requireNativeModule('AppleMusicPlayer');
    } catch {
      resolved = null;
    }
  }
  return resolved ?? null;
}

/** 原生播放模块是否可用（iOS + 已打进包） */
export function isPlayerAvailable(): boolean {
  return !!nativeModule()?.playSong;
}

let emitter: EventEmitter | null = null;

function getEmitter(): EventEmitter {
  if (!emitter) {
    const mod = nativeModule();
    if (!mod) throw new Error('AppleMusicPlayer 原生模块不可用');
    emitter = new EventEmitter(mod);
  }
  return emitter;
}

/** 按 Apple Music catalog id 播放全曲，返回整首时长（秒） */
export async function playSong(appleMusicId: string): Promise<{ duration?: number }> {
  const mod = nativeModule();
  if (!mod?.playSong) throw new Error('AppleMusicPlayer 原生模块不可用');
  return mod.playSong(String(appleMusicId));
}

export async function resume(): Promise<void> {
  const mod = nativeModule();
  if (!mod?.resume) return;
  await mod.resume();
}

export async function pause(): Promise<void> {
  const mod = nativeModule();
  if (!mod?.pause) return;
  await mod.pause();
}

/** 跳转到整首歌的第 seconds 秒 */
export async function seek(seconds: number): Promise<void> {
  const mod = nativeModule();
  if (!mod?.seek) return;
  await mod.seek(seconds);
}

export async function stop(): Promise<void> {
  const mod = nativeModule();
  if (!mod?.stop) return;
  await mod.stop();
}

/** 订阅播放状态事件（status / position / duration / finished） */
export function addPlaybackListener(listener: (event: PlaybackStatusEvent) => void): PlaybackListenerHandle {
  return getEmitter().addListener('onPlaybackStatus', listener);
}
