import { MusicSong } from './musicApi';

/**
 * 乐观插入的「已添加歌曲」缓存（补救方案）。
 *
 * 添加歌曲后：后端会先落库、再异步跑「抓歌词 → AI 翻译 → 整理 JSON → 分析考点」，
 * 所以用户返回歌单、列表立刻重新拉取时，这首歌可能还没出现在服务端列表里。
 * 为不依赖后端异步处理的快慢，添加成功时把接口返回的（带真实服务端 id 的）歌曲
 * 先缓存到这里；歌单详情页初始加载时合并进去，用户立刻能看到刚加的歌。
 *
 * 一旦服务端列表真正返回该 id，合并时按 id 去重，缓存项就是冗余的，不会有重复。
 * 缓存按 collectionId 分桶，取一次即清空（详情页只注入一次）。
 */

const cache = new Map<number, MusicSong[]>();

/** 添加成功后调用：把服务器返回的真实歌曲暂存，供详情页合并 */
export function pushAddedSong(collectionId: number, song: MusicSong): void {
  if (!collectionId || !song) return;
  const list = cache.get(collectionId) || [];
  if (list.some((s) => s.id === song.id)) return;
  cache.set(collectionId, [...list, song]);
}

/** 详情页初始加载时调用：取出并清空该歌单的缓存（只注入一次） */
export function takeAddedSongs(collectionId: number): MusicSong[] {
  const list = cache.get(collectionId) || [];
  cache.delete(collectionId);
  return list;
}
