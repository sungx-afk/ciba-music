import { api } from './api';
import { AppleMusicSong } from '../../modules/apple-music-player';

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
  /** 歌单类型：1=个人歌单（可搜索添加歌曲），0=精选/官方歌单（不可添加） */
  type?: number;
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
  /** 当前登录用户是否已学该歌（服务器按 tbl_music_learned 回填） */
  learned?: boolean;
  /**
   * 学习要点：AI 据歌词分析的考点，服务端存为 JSON 字符串。
   * 结构见 ExamPointAnalysis：{ summary, level, points: [{ category, point, example, analysis }] }
   */
  examPoints?: string;
}

/** 单个考点（对应服务端 ExamPoint） */
export interface ExamPointItem {
  /** 分类：词汇 / 短语搭配 / 语法 / 句型 / 修辞 等 */
  category?: string;
  /** 考点名称，如「虚拟语气」「take it easy」 */
  point?: string;
  /** 歌词中的原文例句 */
  example?: string;
  /** 考点讲解 */
  analysis?: string;
}

/** 整首歌的考点分析（对应服务端 ExamPointAnalysis） */
export interface ExamPointAnalysis {
  /** 整体概述 */
  summary?: string;
  /** 建议适配的考试 / 难度级别，如 CET-4、考研 */
  level?: string;
  /** 考点明细 */
  points?: ExamPointItem[];
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
      type: toNumber(item.type),
    }));
  },

  /** 歌单下的歌曲，按 start/limit 翻页；learned 传 0/1 时按学习状态过滤 */
  getCollectionSongs: async (
    collectionId: number,
    start = 0,
    limit = 20,
    /** 学习状态过滤：0=学习中，1=已学；不传则返回全部 */
    learned?: number,
  ): Promise<{ list: MusicSong[]; total: number }> => {
    const res = await api.get<ListEnvelope>('/musics', { collectionId, start, limit, learned });
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
        learned: Boolean(item.learned),
        examPoints: toText(item.examPoints) || undefined,
      })),
    };
  },

  /**
   * 把 Apple Music 搜到的歌加入歌单（保存到服务器）。
   * POST /music/collections/{id}/musics
   *
   * 不传 musicId，后端按 title/artist/album 等新建一首，并自动跑
   * 抓取歌词 → AI 翻译 → 整理 JSON → 回写 → 分析考点的完整流程。
   * 该歌单必须是当前登录用户的个人歌单，否则后端返回登录 / 权限错误。
   *
   * 入参用 Apple Music 原始结构，映射成后端字段只在这里做：
   *   title/artist/album/duration 直传；url=试听片段；coverUrl=封面；appleId=目录 id。
   */
  addMusicToCollection: async (collectionId: number, song: AppleMusicSong): Promise<MusicSong> => {
    const res = await api.postForm<{ music?: any }>(`/music/collections/${collectionId}/musics`, {
      title: song.title,
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      url: song.previewUrl || '',
      coverUrl: song.artworkUrl || '',
      appleId: song.id,
    });
    const m = res?.music;
    return m
      ? {
          id: toNumber(m.id),
          title: toText(m.title),
          artist: toText(m.artist),
          album: toText(m.album),
          duration: toNumber(m.duration),
          url: toText(m.url),
          coverUrl: toText(m.coverUrl),
          description: toText(m.description),
          sortOrder: toNumber(m.sortOrder),
          studyStatus:
            m.studyStatus === undefined || m.studyStatus === null ? undefined : toNumber(m.studyStatus),
          lyric: toText(m.lyric),
          bilingualLyric: toText(m.bilingualLyric),
          previewStartSec:
            m.previewStartSec === undefined || m.previewStartSec === null
              ? undefined
              : toNumber(m.previewStartSec),
          appleId: m.appleId === undefined || m.appleId === null ? undefined : toNumber(m.appleId),
          isrc: toText(m.isrc) || undefined,
          examPoints: toText(m.examPoints) || undefined,
        }
      : {
          id: 0,
          title: song.title,
          artist: song.artist,
          album: song.album,
          duration: song.duration,
          url: song.previewUrl || '',
          coverUrl: song.artworkUrl || '',
          description: '',
          sortOrder: 0,
          appleId: Number(song.id) || undefined,
        };
  },

  /**
   * 标记 / 取消歌曲「已学」（按当前登录用户）。
   * POST /musics/{id}/learned?learned=1
   * learned=true 标记已学，false 取消已学；结果写进服务端 tbl_music_learned。
   */
  markLearned: async (songId: number, learned: boolean): Promise<void> => {
    await api.postForm(`/musics/${songId}/learned`, { learned: learned ? 1 : 0 });
  },
};
