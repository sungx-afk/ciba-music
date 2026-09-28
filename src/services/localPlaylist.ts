import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppleMusicSong } from '../../modules/apple-music-player';
import { MusicSong } from './musicApi';

/**
 * 歌单「本地添加」临时存储（后续接入后端添加接口后可整体替换此文件）。
 *
 * 搜索页从 Apple Music 搜到的歌，暂时只存到本机 AsyncStorage，按 collectionId 分桶；
 * 歌单详情页加载时把本地歌曲合并进列表头部展示。数据用 Apple Music 原始结构保存，
 * 映射成 MusicSong 只在这一个地方做，方便以后直接换成后端歌曲。
 */

const keyFor = (collectionId: number) => `@ciba_local_songs#${collectionId}`;

/** 读取某歌单本地添加的歌曲（Apple Music 原始结构） */
export async function getLocalSongs(collectionId: number): Promise<AppleMusicSong[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(collectionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AppleMusicSong[]) : [];
  } catch {
    return [];
  }
}

/**
 * 添加一首到歌单（按 id 去重）。
 * @returns true 表示新加入，false 表示已在歌单里（不重复加）
 */
export async function addLocalSong(collectionId: number, song: AppleMusicSong): Promise<boolean> {
  const existing = await getLocalSongs(collectionId);
  if (existing.some((s) => s.id === song.id)) return false;
  const next = [...existing, song];
  await AsyncStorage.setItem(keyFor(collectionId), JSON.stringify(next));
  emitLocalSongs(collectionId);
  return true;
}

/** 本地加入的 Apple Music 歌曲 → 歌单歌曲结构，复用现有列表 / 试听 / 播放逻辑 */
export function mapAppleSongToMusicSong(s: AppleMusicSong): MusicSong {
  return {
    id: Number(s.id) || 0,
    title: s.title,
    artist: s.artist,
    album: s.album,
    /** 时长（秒） */
    duration: s.duration,
    /** 试听片段地址（Apple 30s~60s） */
    url: s.previewUrl || '',
    coverUrl: s.artworkUrl || '',
    description: '',
    sortOrder: -1,
    /** 全曲播放（方案 B）用得到的 Apple Music catalog id */
    appleId: Number(s.id) || undefined,
  };
}

/**
 * 轻量事件总线：搜索页 addLocalSong 后通知歌单详情页刷新。
 * 跨页面、不依赖导航栈是否还挂着详情页，详情页订阅即可。
 */
type Listener = () => void;
const listenersByCollection = new Map<number, Set<Listener>>();

export function subscribeLocalSongs(collectionId: number, cb: Listener): () => void {
  let set = listenersByCollection.get(collectionId);
  if (!set) {
    set = new Set();
    listenersByCollection.set(collectionId, set);
  }
  set.add(cb);
  return () => {
    set!.delete(cb);
  };
}

function emitLocalSongs(collectionId: number) {
  listenersByCollection.get(collectionId)?.forEach((cb) => cb());
}
