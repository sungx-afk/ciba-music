import { api } from './api';

/**
 * 听歌学英语的音乐接口。
 *
 * 两个接口都不依赖登录态（不带 token 也能返回数据），但请求仍然走统一的 api.get，
 * 这样登录用户会带上自己的 token，plat/app_id/build 也保持一致。
 *
 * - 歌单列表：GET /music/collections.json
 * - 歌单歌曲：GET /musics.json?collectionId=xxx&start=0&limit=20
 *
 * 返回体统一为 { list, total, result, msg }。
 */

export interface MusicCollection {
  id: number;
  name: string;
  coverUrl: string;
  description: string;
  songCount: number;
  sortOrder: number;
}

export interface MusicSong {
  id: number;
  title: string;
  artist: string;
  album: string;
  /** 时长，单位秒 */
  duration: number;
  /** 音频地址（Apple 提供的试听片段） */
  url: string;
  coverUrl: string;
  /** 这首歌的语法 / 词汇重点，例如「基础动词、祈使句」 */
  description: string;
  sortOrder: number;
  /**
   * 学习状态：2 = 已学习，其它 / 缺失 = 学习中或未学习。
   * 后端暂未下发，界面拿到后才按「学习中 / 已学习」分区。
   */
  studyStatus?: number;
  /** 原始 LRC 歌词（中英交替两行一句） */
  lyric?: string;
  /** 结构化双语歌词：JSON 字符串 [{ time, seconds, en, zh }] */
  bilingualLyric?: string;
  /**
   * 试听片段在整首歌里的起点（秒）。
   * Apple 的 30 秒片段起点由发行方指定、每首歌都不一样，接口不下发就算不出来；
   * 没有它，歌词时间轴和片段音频就无法对齐，播放页会关掉跟随高亮。
   */
  previewStartSec?: number;
  /** Apple Music 目录 id（方案 B 全曲播放用） */
  appleId?: number;
  /** 国际录音码，Apple Music 目录匹配用 */
  isrc?: string;
}

/** 一行双语歌词：seconds 用于跟播放进度对齐 */
export interface LyricLine {
  seconds: number;
  /** mm:ss，展示用 */
  time: string;
  en: string;
  zh: string;
}

interface ListEnvelope {
  list?: any[];
  total?: number;
}

const toNumber = (value: any, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toText = (value: any): string => (value === undefined || value === null ? '' : String(value));

/** 秒 → m:ss */
export function formatDuration(seconds?: number): string {
  const total = toNumber(seconds, 0);
  if (total <= 0) return '--:--';
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/** 毫秒 → m:ss */
export function formatMillis(ms?: number): string {
  return formatDuration(Math.floor(toNumber(ms, 0) / 1000));
}



const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

/** 解析 [mm:ss.xx]歌词 的原始 LRC：同一时间点的英/中两行合并成一句 */
function parseLrc(lrc?: string): LyricLine[] {
  const text = toText(lrc);
  if (!text) return [];
  const regex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]([^\n]*)/g;
  const items: { seconds: number; time: string; text: string }[] = [];
  let match = regex.exec(text);
  while (match) {
    const min = toNumber(match[1]);
    const sec = toNumber(match[2]);
    const frac = match[3] ? Number(`0.${match[3]}`) : 0;
    const content = toText(match[4]).trim();
    if (content) {
      items.push({
        seconds: min * 60 + sec + frac,
        time: `${pad2(min)}:${pad2(sec)}`,
        text: content,
      });
    }
    match = regex.exec(text);
  }

  const hasZh = (s: string) => /[\u4e00-\u9fa5]/.test(s);
  const lines: LyricLine[] = [];
  for (let i = 0; i < items.length; i += 1) {
    const cur = items[i];
    const next = items[i + 1];
    // 双语 LRC 里英文行紧跟同一时间点的中文行，合并成一句
    if (
      !hasZh(cur.text) &&
      next &&
      Math.abs(next.seconds - cur.seconds) < 0.01 &&
      hasZh(next.text)
    ) {
      lines.push({ seconds: cur.seconds, time: cur.time, en: cur.text, zh: next.text });
      i += 1;
      continue;
    }
    if (!hasZh(cur.text)) lines.push({ seconds: cur.seconds, time: cur.time, en: cur.text, zh: '' });
  }
  return lines;
}

/**
 * 取歌曲的双语歌词。
 * 优先用结构化的 bilingualLyric（带 seconds，直接跟进度对齐），
 * 没有再退回解析原始 LRC；两种情况都拿不到就返回空数组，播放页会显示空态。
 */
export function parseLyricLines(song?: Partial<MusicSong> | null): LyricLine[] {
  if (!song) return [];
  const raw = toText(song.bilingualLyric);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const lines = parsed
          .map((item: any): LyricLine => ({
            seconds: toNumber(item.seconds),
            time: toText(item.time),
            en: toText(item.en),
            zh: toText(item.zh),
          }))
          .filter((l) => l.en || l.zh)
          .sort((a, b) => a.seconds - b.seconds);
        if (lines.length) return lines;
      }
    } catch {
      // JSON 解析失败就走下面的 LRC 兜底
    }
  }
  return parseLrc(song.lyric);
}

export const MusicApi = {
  /** 歌单列表（精选歌单） */
  getCollections: async (): Promise<MusicCollection[]> => {
    const res = await api.get<ListEnvelope>('/music/collections');
    const list = Array.isArray(res?.list) ? res.list : [];
    return list.map((item: any): MusicCollection => ({
      id: toNumber(item.id),
      name: toText(item.name),
      coverUrl: toText(item.coverUrl),
      description: toText(item.description),
      songCount: toNumber(item.songCount),
      sortOrder: toNumber(item.sortOrder),
    }));
  },

  /** 歌单下的歌曲，按 start/limit 翻页 */
  getCollectionSongs: async (
    collectionId: number,
    start = 0,
    limit = 20,
  ): Promise<{ list: MusicSong[]; total: number }> => {
    const res = await api.get<ListEnvelope>('/musics', { collectionId, start, limit });
    const raw = Array.isArray(res?.list) ? res.list : [];
    return {
      total: toNumber(res?.total, 0),
      list: raw.map((item: any): MusicSong => ({
        id: toNumber(item.id),
        title: toText(item.title),
        artist: toText(item.artist),
        album: toText(item.album),
        duration: toNumber(item.duration),
        url: toText(item.url),
        coverUrl: toText(item.coverUrl),
        description: toText(item.description),
        sortOrder: toNumber(item.sortOrder),
        // 后端还没这个字段，缺省时留 undefined，界面据此判断能否分区
        studyStatus:
          item.studyStatus === undefined || item.studyStatus === null
            ? undefined
            : toNumber(item.studyStatus),
        lyric: toText(item.lyric),
        bilingualLyric: toText(item.bilingualLyric),
        previewStartSec:
          item.previewStartSec === undefined || item.previewStartSec === null
            ? undefined
            : toNumber(item.previewStartSec),
        appleId: item.appleId === undefined || item.appleId === null ? undefined : toNumber(item.appleId),
        isrc: toText(item.isrc) || undefined,
      })),
    };
  },
};
