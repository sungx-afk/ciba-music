import { PlayerBackend, PlayerState, PlayerTrack } from './types';
import { previewBackend } from './previewBackend';
import { appleMusicBackend } from './appleMusicBackend';

/**
 * 播放器控制器：对上只暴露「加载 / 播放 / 暂停 / 跳转 / 释放」和一份状态，
 * 对下按可用性挑一个 backend（现在只会挑到 preview，方案 B 后可能挑 appleMusic）。
 * 页面层不要直接引 expo-av 或 MusicKit，都从这里走。
 */

const INITIAL_STATE: PlayerState = {
  source: null,
  trackId: null,
  playing: false,
  loading: false,
  position: 0,
  duration: 0,
  error: '',
  finishedCount: 0,
};

type Listener = (state: PlayerState) => void;

class MusicPlayer {
  private state: PlayerState = INITIAL_STATE;
  private listeners = new Set<Listener>();
  private backend: PlayerBackend | null = null;
  private track: PlayerTrack | null = null;

  getState(): PlayerState {
    return this.state;
  }

  /** 订阅状态变化，返回取消订阅函数 */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(patch: Partial<PlayerState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener(this.state));
  }

  /** 选源 + 加载一首歌；默认加载完就播 */
  async load(track: PlayerTrack, options: { autoPlay?: boolean } = {}): Promise<void> {
    const autoPlay = options.autoPlay !== false;
    // 同一首已经加载过了，只补播，不重复加载
    if (this.track?.id === track.id && this.backend) {
      if (autoPlay) await this.play();
      return;
    }

    await this.release();
    this.track = track;

    const backend = (await appleMusicBackend.isAvailable(track))
      ? appleMusicBackend
      : previewBackend;
    this.backend = backend;

    this.emit({
      source: backend.kind,
      trackId: track.id,
      loading: true,
      playing: false,
      position: 0,
      duration: (track.duration || 0) * 1000,
      error: '',
    });

    try {
      await backend.load(
        track,
        (patch) => this.emit(patch),
        () => this.emit({ playing: false, finishedCount: this.state.finishedCount + 1 }),
      );
      if (autoPlay) await backend.play();
    } catch (e: any) {
      this.emit({ loading: false, error: e?.message || '播放失败' });
    }
  }

  async play(): Promise<void> {
    const backend = this.backend;
    if (!backend) return;
    await backend.play();
    this.emit({ playing: true });
  }

  async pause(): Promise<void> {
    const backend = this.backend;
    if (!backend) return;
    await backend.pause();
    this.emit({ playing: false });
  }

  async toggle(): Promise<void> {
    if (this.state.playing) await this.pause();
    else await this.play();
  }

  async seek(ms: number): Promise<void> {
    const backend = this.backend;
    if (!backend) return;
    this.emit({ position: Math.max(0, ms) });
    await backend.seek(ms);
  }

  /** 停掉并卸载音频（离开播放页 / 换歌前调用） */
  async release(): Promise<void> {
    const backend = this.backend;
    this.backend = null;
    this.track = null;
    if (backend) {
      try {
        await backend.stop();
      } catch {
        // 卸载失败也继续重置状态
      }
    }
    this.emit({ source: null, trackId: null, playing: false, loading: false, position: 0, duration: 0 });
  }
}

export const musicPlayer = new MusicPlayer();
