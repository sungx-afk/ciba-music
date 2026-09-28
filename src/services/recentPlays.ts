import AsyncStorage from '@react-native-async-storage/async-storage';
import { MusicSong } from './musicApi';

/**
 * 「最近播放」本机记录（最多 20 条，按最近播放时间倒序）。
 *
 * 为什么不直接复用歌单接口：
 * 首页只需要「封面 / 歌名 / 歌手 / 时长」和「能重新播这首歌」的最小字段，
 * lyric / bilingualLyric 这类几十 KB 的大字段不入库，避免把 AsyncStorage 撑爆。
 *
 * key 与学习进度一致按账号隔离：登录后带 #userId，未登录用游客公共 key。
 */

export interface RecentPlayItem {
  id: number;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  /** 时长（秒） */
  duration: number;
  /** 试听片段地址（重新播放用） */
  url: string;
  /** Apple Music catalog id，全曲播放用 */
  appleId?: number;
  /** 试听片段在整首歌里的起点（秒） */
  previewStartSec?: number;
  /** 语法 / 词汇重点 */
  description: string;
  /** 最近一次播放的时间戳（ms） */
  playedAt: number;
}

const BASE_KEY = '@ciba_recent_plays_v1';
/** 超出后丢掉最旧的，避免无限增长 */
const MAX_ITEMS = 20;

const keyFor = (accountId: string) => (accountId ? `${BASE_KEY}#${accountId}` : BASE_KEY);

/** 从登录用户里取账号 id；取不到返回空串（游客作用域），判定口径与 progressStore 一致 */
export function accountIdOf(user: any): string {
  const id = user?.id ?? user?.userId ?? user?.uid;
  return id == null || id === '' ? '' : String(id);
}

/** 最近播放条目 → 可播放的歌曲结构（补上列表用的缺省字段） */
export function toMusicSong(item: RecentPlayItem): MusicSong {
  return {
    id: item.id,
    title: item.title,
    artist: item.artist,
    album: item.album,
    duration: item.duration,
    url: item.url,
    coverUrl: item.coverUrl,
    description: item.description,
    sortOrder: 0,
    previewStartSec: item.previewStartSec,
    appleId: item.appleId,
    lyric: '',
    bilingualLyric: '',
  };
}

/** 把磁盘上的脏数据收敛成合法结构，字段缺失一律补默认值 */
function normalize(raw: any): RecentPlayItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === 'object' && x.id != null)
    .map(
      (x: any): RecentPlayItem => ({
        id: Number(x.id) || 0,
        title: String(x.title ?? ''),
        artist: String(x.artist ?? ''),
        album: String(x.album ?? ''),
        coverUrl: String(x.coverUrl ?? ''),
        duration: Number(x.duration) || 0,
        url: String(x.url ?? ''),
        appleId: x.appleId == null || x.appleId === '' ? undefined : Number(x.appleId) || undefined,
        previewStartSec:
          x.previewStartSec == null || x.previewStartSec === ''
            ? undefined
            : Number(x.previewStartSec),
        description: String(x.description ?? ''),
        playedAt: Number(x.playedAt) || 0,
      }),
    );
}

export async function getRecentPlays(accountId: string): Promise<RecentPlayItem[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(accountId));
    if (!raw) return [];
    return normalize(JSON.parse(raw)).sort((a, b) => b.playedAt - a.playedAt);
  } catch {
    return [];
  }
}

/** 记一次播放：同一首去重后提到最前，超出上限截断 */
export async function recordRecentPlay(accountId: string, song: MusicSong): Promise<void> {
  if (!song || song.id == null) return;
  try {
    const list = await getRecentPlays(accountId);
    const item: RecentPlayItem = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: song.album,
      coverUrl: song.coverUrl,
      duration: song.duration,
      url: song.url,
      appleId: song.appleId,
      previewStartSec: song.previewStartSec,
      description: song.description,
      playedAt: Date.now(),
    };
    const next = [item, ...list.filter((x) => x.id !== item.id)].slice(0, MAX_ITEMS);
    await AsyncStorage.setItem(keyFor(accountId), JSON.stringify(next));
    emit();
  } catch {
    // 写历史失败不该影响播放，静默忽略
  }
}

export async function clearRecentPlays(accountId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyFor(accountId));
  } catch {
    // 忽略
  }
  emit();
}

/**
 * 轻量事件总线：播放页写入后，首页不用等重新挂载就能刷新列表。
 * 各页面自己按当前账号去读，所以这里不带数据。
 */
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeRecentPlays(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function emit() {
  listeners.forEach((cb) => cb());
}
