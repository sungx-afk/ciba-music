import { Audio } from 'expo-av';
import { pronounceWord } from './speech';

/**
 * 单词发音：优先播接口给的 mp3（更地道），失败退回系统 TTS。
 * 全局共用同一个 Sound 实例，切词先卸载上一段。
 */

let sound: Audio.Sound | null = null;
let modeReady = false;

async function ensureAudioMode(): Promise<void> {
  if (modeReady) return;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    modeReady = true;
  } catch {
    // 音频模式设置失败不阻塞发音
  }
}

export async function stopWordAudio(): Promise<void> {
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

/** 播放单词发音：url 为空或播放失败时用 TTS 兜底 */
export async function playWordAudio(
  url: string | undefined,
  word: string,
  accent: 'en-US' | 'en-GB' = 'en-US'
): Promise<void> {
  await stopWordAudio();
  if (url) {
    try {
      await ensureAudioMode();
      const { sound: created } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, volume: 1 }
      );
      sound = created;
      created.setOnPlaybackStatusUpdate((status: any) => {
        if (status?.isLoaded && status?.didJustFinish) void stopWordAudio();
      });
      return;
    } catch {
      // 播 mp3 失败，退回 TTS
    }
  }
  pronounceWord(word, { accent });
}
