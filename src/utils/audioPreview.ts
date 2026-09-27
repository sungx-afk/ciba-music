import { Audio } from 'expo-av';

/**
 * 歌曲列表里的试听播放。
 *
 * 后端给的是 Apple 的试听片段（30s ~ 整首的预览），这里只做最朴素的
 * 「点一首播一首」：全局共用同一个 Sound 实例，切歌先卸载上一首，
 * 页面退出时调用 stopPreview 释放。
 */

let sound: Audio.Sound | null = null;
let playingUrl: string = '';
let enabled: boolean = false;

async function ensureAudioMode(): Promise<void> {
  if (enabled) return;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      // 音乐类App：静音开关下也要能出声，否则用户会以为没播
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    enabled = true;
  } catch {
    // 音频模式设置失败不阻塞播放尝试
  }
}

export function previewingUrl(): string {
  return playingUrl;
}

export async function stopPreview(): Promise<void> {
  const current = sound;
  sound = null;
  playingUrl = '';
  if (!current) return;
  try {
    await current.stopAsync();
    await current.unloadAsync();
  } catch {
    // 已卸载 / 未加载完成时忽略
  }
}

/** 播放指定 url，返回是否起播成功 */
export async function playPreview(url: string, onEnded?: () => void): Promise<boolean> {
  if (!url) return false;
  try {
    await ensureAudioMode();
    await stopPreview();
    const { sound: created } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true, volume: 1.0 },
    );
    sound = created;
    playingUrl = url;
    created.setOnPlaybackStatusUpdate((status: any) => {
      if (status?.isLoaded && status?.didJustFinish) {
        const finishedUrl = playingUrl;
        void stopPreview();
        if (finishedUrl === url) onEnded?.();
      }
    });
    return true;
  } catch {
    await stopPreview();
    return false;
  }
}
