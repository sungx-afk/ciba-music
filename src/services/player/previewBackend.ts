import { Audio } from 'expo-av';
import { PlayerBackend, PlayerTrack, StateEmitter } from './types';

/**
 * 试听片段源：用 expo-av 播接口给的 Apple 预览音频（30s~60s）。
 * 全曲播放（方案 B）接通前，所有歌曲都走这里。
 */

let sound: Audio.Sound | null = null;
let modeReady = false;

async function ensureAudioMode(): Promise<void> {
  if (modeReady) return;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      // 音乐类 App：静音开关下也要出声
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    modeReady = true;
  } catch {
    // 音频模式设置失败不阻塞播放尝试
  }
}

async function releaseSound(): Promise<void> {
  const current = sound;
  sound = null;
  if (!current) return;
  try {
    await current.stopAsync();
    await current.unloadAsync();
  } catch {
    // 已卸载 / 未加载完成时忽略
  }
}

export const previewBackend: PlayerBackend = {
  kind: 'preview',

  async isAvailable(track: PlayerTrack) {
    return !!track.url;
  },

  async load(track: PlayerTrack, emit: StateEmitter, onFinish: () => void) {
    await releaseSound();
    await ensureAudioMode();
    if (!track.url) {
      emit({ loading: false, error: '这首歌暂无音频，换一首试试' });
      return;
    }

    const { sound: created } = await Audio.Sound.createAsync(
      { uri: track.url },
      { shouldPlay: false, volume: 1, progressUpdateIntervalMillis: 250 },
    );
    sound = created;

    created.setOnPlaybackStatusUpdate((status: any) => {
      if (!status?.isLoaded) return;
      emit({
        playing: !!status.isPlaying,
        position: status.positionMillis || 0,
        loading: false,
      });
      if (status.durationMillis) emit({ duration: status.durationMillis });
      if (status.didJustFinish) {
        emit({ playing: false });
        onFinish();
      }
    });

    emit({ loading: false, position: 0 });
  },

  async play() {
    if (!sound) return;
    await sound.playAsync();
  },

  async pause() {
    if (!sound) return;
    await sound.pauseAsync();
  },

  async seek(ms: number) {
    if (!sound) return;
    await sound.setPositionAsync(Math.max(0, ms));
  },

  async stop() {
    await releaseSound();
  },
};
