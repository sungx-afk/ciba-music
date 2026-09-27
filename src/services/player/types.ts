/**
 * 播放源抽象。
 *
 * 现在只有一个源：preview（expo-av 播接口返回的 Apple 试听片段）。
 * 方案 B 接入 Apple Music 全曲播放后，只要在 appleMusicBackend 里实现同一套接口、
 * 把开关打开，上层的 PlayerScreen / 歌词进度等都不用改。
 */

export type PlaybackSource = 'preview' | 'appleMusic';

/** 一首可播放的东西：试听用 url，全曲用 appleId（Apple Music catalog id） */
export interface PlayerTrack {
  /** 稳定唯一 key，用于判断「换歌还是同一首」 */
  id: string;
  title?: string;
  /** 试听片段地址 */
  url?: string;
  /** Apple Music catalog id，方案 B 组播放队列用 */
  appleId?: string;
  /** 时长（秒），用于播放器还没拿到真实时长时兜底 */
  duration?: number;
}

export interface PlayerState {
  /** 当前实际使用的播放源 */
  source: PlaybackSource | null;
  trackId: string | null;
  playing: boolean;
  loading: boolean;
  /** 已播毫秒 */
  position: number;
  /** 总时长毫秒 */
  duration: number;
  error: string;
  /** 「自然播完」一次就 +1，UI 据此决定要不要接下一首 */
  finishedCount: number;
}

export type StateEmitter = (patch: Partial<PlayerState>) => void;

export interface PlayerBackend {
  readonly kind: PlaybackSource;
  /** 这个源能不能播这首（appleMusic：已订阅 + 有 appleId） */
  isAvailable(track: PlayerTrack): Promise<boolean>;
  load(track: PlayerTrack, emit: StateEmitter, onFinish: () => void): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(ms: number): Promise<void>;
  stop(): Promise<void>;
}
