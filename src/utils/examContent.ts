/**
 * 学习要点正文（ExamPointEntry.content）是后端 AI 生成的一整段纯文本，
 * 直接整块渲染就是「一堵墙」，读起来很累。
 *
 * 这里按正文里稳定出现的小标题（常见搭配 / 注意 / 易错点 / 例句N）拆成分段，
 * 交给页面分区渲染：搭配变列表、注意变提示框、例句变编号例句卡，其余留作正文段落。
 * 任何一步拆不出来都退回原文，保证内容不丢、不报错。
 */

/** 词条 + 释义（搭配项复用） */
export interface ExamPair {
  /** 词条，如 in trouble */
  term: string;
  /** 释义，如 陷入困境/惹上麻烦 */
  gloss: string;
}

/** 单条例句：英文原句 + 中文翻译 */
export interface ExamExample {
  en: string;
  zh: string;
}

export type ExamSegment =
  | { kind: 'para'; text: string }
  | { kind: 'list'; title: string; items: ExamPair[] }
  | { kind: 'note'; title: string; text: string }
  | { kind: 'examples'; items: ExamExample[] };

const OPEN = '（(';
const CLOSE = '）)';
const SENTENCE_END = '。！？!?';

/** 小标题：例句（可带序号） */
const EXAMPLE_RE = /例句\s*[0-9０-９]*\s*[：:]/g;
/** 小标题：注意事项 */
const NOTE_RE = /(需特别注意|需要特别注意|特别注意|需要注意的是|需注意|易错点|易错|注意)\s*[：:]/g;
/** 小标题：搭配清单 */
const LIST_RE = /(常见搭配|常用搭配|固定搭配|高频搭配|重点短语|常用短语|高频短语|短语|搭配)\s*[：:]/g;

type MarkerKind = 'examples' | 'note' | 'list';

interface Marker {
  index: number;
  end: number;
  kind: MarkerKind;
  label: string;
}

/** 找到 depth 为 0 的第一个分隔符，切成 [前, 后]（不含分隔符） */
function cutFirst(text: string, seps: string): [string, string] {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (OPEN.includes(c)) depth++;
    else if (CLOSE.includes(c)) depth = Math.max(0, depth - 1);
    else if (depth === 0 && seps.includes(c)) return [text.slice(0, i), text.slice(i + 1)];
  }
  return [text, ''];
}

/** 按 depth 为 0 的最后一个字符切，切成 [前(含该字符), 后] */
function cutLast(text: string, ch: string): [string, string] {
  let depth = 0;
  let idx = -1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (OPEN.includes(c)) depth++;
    else if (CLOSE.includes(c)) depth = Math.max(0, depth - 1);
    else if (depth === 0 && c === ch) idx = i;
  }
  return idx < 0 ? ['', text] : [text.slice(0, idx + 1), text.slice(idx + 1)];
}

/** 按 depth 为 0 的分隔符切分（括号内的分隔符保留） */
function splitTop(text: string, seps: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (OPEN.includes(c)) depth++;
    else if (CLOSE.includes(c)) depth = Math.max(0, depth - 1);
    if (depth === 0 && seps.includes(c)) {
      out.push(buf);
      buf = '';
      continue;
    }
    buf += c;
  }
  out.push(buf);
  return out;
}

/** 按句子切分，括号内的句号不算断句 */
function splitSentences(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = '';
  for (const c of text) {
    if (OPEN.includes(c)) depth++;
    else if (CLOSE.includes(c)) depth = Math.max(0, depth - 1);
    buf += c;
    if (depth === 0 && SENTENCE_END.includes(c)) {
      out.push(buf.trim());
      buf = '';
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/** 长段落按句子重新排版，避免出现超过 maxLen 的一整块文字 */
function chunkParagraph(text: string, maxLen = 78): string[] {
  const t = text.trim();
  if (t.length <= maxLen) return t ? [t] : [];
  const sentences = splitSentences(t);
  if (sentences.length <= 1) return [t];
  const out: string[] = [];
  let buf = '';
  for (const s of sentences) {
    if (buf && buf.length + s.length > maxLen) {
      out.push(buf);
      buf = s;
    } else {
      buf += s;
    }
  }
  if (buf) out.push(buf);
  return out;
}

/** 解析一整条例句：英文（中文翻译） */
function parseExample(chunk: string): ExamExample {
  const body = chunk.trim().replace(/[。．.]$/, '').trim();
  if (!body) return { en: '', zh: '' };
  // 取最后一对括号作为中文翻译，前面是英文原句
  const m = body.match(/^(.*?)\s*[（(]\s*([^（()）]*?)\s*[）)]\s*$/);
  if (m && m[1]) return { en: m[1].trim().replace(/[，,;；]$/, ''), zh: m[2].trim() };
  return { en: body, zh: '' };
}

/** 解析搭配清单：逗号/顿号分隔，每项为 词条（释义） */
function parseList(body: string): ExamPair[] {
  return splitTop(body, '、，,')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((raw) => toPair(raw) || { term: raw, gloss: '' });
}

/** 单个「词条（释义）」；不是这种形态返回 null */
function toPair(raw: string): ExamPair | null {
  const s = raw.replace(/^[•·\-*]\s*/, '').trim();
  if (!s) return null;
  const m = s.match(/^(.*?)\s*[（(]\s*([^（()）]+)\s*[）)]\s*$/);
  if (m && m[1]) return { term: m[1].trim(), gloss: m[2].trim() };
  return null;
}

/** 清单标题独占一行时，后续的「词条（释义）」行合并进来；普通句子返回 null */
function toStandalonePair(line: string): ExamPair | null {
  const s = line.replace(/^[•·\-*]\s*/, '').trim();
  const pair = toPair(s);
  if (pair && pair.term.length <= 40) return pair;
  if (s.length <= 24 && /^[A-Za-z][A-Za-z\s'’.\-]*$/.test(s)) return { term: s, gloss: '' };
  return null;
}

function collect(text: string, re: RegExp, kind: MarkerKind, labelOf: (m: RegExpExecArray) => string) {
  const out: Marker[] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ index: m.index, end: m.index + m[0].length, kind, label: labelOf(m) });
    if (re.lastIndex === m.index) re.lastIndex += 1;
  }
  return out;
}

/** 解析单行正文（不含换行）：按小标题切分成段落 / 清单 / 提示 / 例句 */
function parseLine(text: string): ExamSegment[] {
  const markers = [
    ...collect(text, EXAMPLE_RE, 'examples', () => '例句'),
    ...collect(text, NOTE_RE, 'note', (m) => m[1]),
    ...collect(text, LIST_RE, 'list', (m) => m[1]),
  ].sort((a, b) => a.index - b.index);

  // 同一位置可能被多条规则命中，保留先出现的那条
  const picked: Marker[] = [];
  for (const mk of markers) {
    const last = picked[picked.length - 1];
    if (last && mk.index < last.end) continue;
    picked.push(mk);
  }

  if (!picked.length) return chunkParagraph(text).map((p) => ({ kind: 'para', text: p }));

  const segments: ExamSegment[] = [];
  const pushPara = (raw: string) => {
    chunkParagraph(raw).forEach((p) => segments.push({ kind: 'para', text: p }));
  };

  let cursor = 0;
  for (let i = 0; i < picked.length; i++) {
    const mk = picked[i];
    const nextStart = i + 1 < picked.length ? picked[i + 1].index : text.length;
    const before = text.slice(cursor, mk.index);
    const body = text.slice(mk.end, nextStart).trim();
    cursor = nextStart;

    if (mk.kind === 'examples') {
      pushPara(before);
      // 例句后面可能还跟着收尾正文（最后一条例句尤其常见），按句号切开
      const [egPart, rest] = cutFirst(body, '。');
      const example = parseExample(egPart);
      if (example.en) {
        const last = segments[segments.length - 1];
        if (last && last.kind === 'examples') last.items.push(example);
        else segments.push({ kind: 'examples', items: [example] });
      }
      pushPara(rest);
      continue;
    }

    // 搭配 / 注意：小标题前面的引子（最后一个句号之后的一句）并入标题，
    // 例如「作不可数名词时 + 常见搭配」。引子太长就不当标题用，退回正文。
    const [head, tail] = cutLast(before, '。');
    const lead = tail.trim();
    const useLead = lead.length > 0 && lead.length <= 12;
    pushPara(useLead ? head : before);
    const title = useLead ? `${lead}${mk.label}` : mk.label;

    if (mk.kind === 'list') {
      const [listPart, rest] = cutFirst(body, '；;。');
      segments.push({ kind: 'list', title, items: parseList(listPart) });
      pushPara(rest);
    } else if (body) {
      segments.push({ kind: 'note', title, text: body });
    }
  }

  return segments;
}

/**
 * 把一条学习要点的讲解正文解析成分段。
 * 拆不出小标题时返回普通段落，页面按正文渲染，保证任何内容都能正常显示。
 */
export function parseExamContent(content?: string): ExamSegment[] {
  const raw = (content || '').replace(/\r/g, '');
  if (!raw.trim()) return [];

  // 后端有的用换行分隔小标题，逐行解析再拼接；单行时结果与整体解析一致
  const out: ExamSegment[] = [];
  let openedList = false; // 上一行是「清单标题：」，等待后续行补条目

  for (const rawLine of raw.split('\n')) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (!line) continue;

    if (openedList) {
      const item = toStandalonePair(line);
      const last = out[out.length - 1];
      if (item && last && last.kind === 'list') {
        last.items.push(item);
        continue;
      }
      openedList = false;
    }

    const segs = parseLine(line);
    out.push(...segs);
    const tail = out[out.length - 1];
    openedList = Boolean(tail && tail.kind === 'list' && !tail.items.length);
  }

  return out;
}
