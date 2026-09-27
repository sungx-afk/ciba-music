import { APIError, api } from './api';

/**
 * 词典查词接口。
 *
 * GET /words/search.json?wordName=xxx
 * 返回体：{ word: {...}, result, msg }
 *
 * word 的真实字段（实测线上）：
 *   wordName      单词
 *   phEn / phEnMp3  英式音标 / 英式发音 mp3
 *   phAm / phAmMp3  美式音标 / 美式发音 mp3
 *   speechParts[]   词性分组：{ partName: 'n.', means: [{ wordMean: '稳定（性）…' }] }
 *   sentences[]     例句：{ english, chinese, mp3 }
 *   added           0/1，是否已在生词本
 *   frequence       词频
 */

export interface WordMean {
  id: number;
  /** 中文释义 */
  wordMean: string;
}

export interface WordSpeechPart {
  /** 词性，如 n. / v. / 网络 */
  partName: string;
  means: WordMean[];
}

export interface WordSentence {
  english: string;
  chinese: string;
  mp3?: string;
}

export interface WordDetail {
  id: number;
  wordName: string;
  /** 英式音标 */
  phEn: string;
  /** 美式音标 */
  phAm: string;
  /** 英式发音 mp3 */
  phEnMp3: string;
  /** 美式发音 mp3 */
  phAmMp3: string;
  frequence: number;
  speechParts: WordSpeechPart[];
  sentences: WordSentence[];
  /** 是否已在生词本 */
  added: boolean;
}

const toText = (value: any): string => (value === undefined || value === null ? '' : String(value));

const toNumber = (value: any, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * 查单词。
 * 失败（未查到 / 网络错误 / token 失效）会抛 APIError，由调用方展示。
 */
export async function searchWord(wordName: string): Promise<WordDetail> {
  const name = String(wordName || '').trim();
  if (!name) throw new APIError(-1, '单词为空，无法查询');

  const rsp = await api.get<any>('/words/search', { wordName: name });
  const w = rsp?.word;
  if (!w || typeof w !== 'object') {
    throw new APIError(Number(rsp?.result) || -1, rsp?.msg || '未查到该单词');
  }

  const speechParts: WordSpeechPart[] = Array.isArray(w.speechParts)
    ? (w.speechParts as any[])
        .map((p) => ({
          partName: toText(p?.partName),
          means: Array.isArray(p?.means)
            ? (p.means as any[])
                .map((m) => ({ id: toNumber(m?.id), wordMean: toText(m?.wordMean).trim() }))
                .filter((m) => m.wordMean)
            : [],
        }))
        .filter((p) => p.means.length > 0)
    : [];

  const sentences: WordSentence[] = Array.isArray(w.sentences)
    ? (w.sentences as any[])
        .map((s) => ({
          english: toText(s?.english).trim(),
          chinese: toText(s?.chinese).trim(),
          mp3: toText(s?.mp3).trim() || undefined,
        }))
        .filter((s) => s.english || s.chinese)
    : [];

  return {
    id: toNumber(w.id),
    wordName: toText(w.wordName).trim() || name,
    phEn: toText(w.phEn).trim(),
    phAm: toText(w.phAm).trim(),
    phEnMp3: toText(w.phEnMp3).trim(),
    phAmMp3: toText(w.phAmMp3).trim(),
    frequence: toNumber(w.frequence),
    speechParts,
    sentences,
    added: toNumber(w.added) === 1,
  };
}
