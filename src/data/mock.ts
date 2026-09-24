export type Song = {
  id: string;
  title: string;
  artist: string;
  level: string;
  tint: string;
  cover: [string, string];
  tag: string;
  duration: string;
};

export const recommendSongs: Song[] = [
  { id: 's1', title: 'Yellow', artist: 'Coldplay', level: 'B1', tint: '#F2B705', cover: ['#F7D774', '#3F4A8A'], tag: '经典', duration: '4:26' },
  { id: 's2', title: 'Perfect', artist: 'Ed Sheeran', level: 'B1', tint: '#2E9BB8', cover: ['#7FD6E8', '#1C5E7A'], tag: '流行', duration: '4:23' },
  { id: 's3', title: 'Someone Like You', artist: 'Adele', level: 'B2', tint: '#8A8F9C', cover: ['#C9CDD6', '#3A3F4A'], tag: '抒情', duration: '4:45' },
  { id: 's4', title: 'Count On Me', artist: 'Bruno Mars', level: 'B2', tint: '#1FC8A0', cover: ['#8CE8CF', '#0F7E67'], tag: '轻快', duration: '3:20' },
];

export const homeBanner = {
  title: '用音乐学英语',
  desc: '听懂歌词、学会表达、提升口语',
  colors: ['#123A6B', '#0A1B33'] as [string, string],
};

export const nowPlaying = {
  title: 'Yellow',
  artist: 'Coldplay',
  album: 'A Rush of Blood to the Head · 2000',
  level: 'B1',
  tag: '流行',
  desc: '一首关于爱与希望的经典之作，歌词简单却充满力量。',
  cover: ['#17295C', '#0A1230'] as [string, string],
  coverTop: 'COLDPLAY',
  coverBottom: 'YELLOW',
  elapsed: '01:24',
  duration: '04:26',
  progress: 0.32,
};

/** 歌词里可点击学习的单词（逐词模式下的释义卡片数据） */
export type LyricWord = {
  word: string;
  phonetic: string;
  pos: string;
  meaning: string;
  example: string;
  exampleZh: string;
};

export type Lyric = {
  id: string;
  en: string;
  zh: string;
  time: string;
  /** 该句里可点击的单词，按在句中出现的顺序排列 */
  words?: LyricWord[];
};

export const playingLyrics: Lyric[] = [
  {
    id: 'p1',
    en: 'Look at the stars',
    zh: '看看天上的星星',
    time: '01:18',
    words: [
      {
        word: 'look',
        phonetic: '/lʊk/',
        pos: 'v.',
        meaning: '看；寻找；注视',
        example: 'Look at the stars.',
        exampleZh: '看看那些星星。',
      },
      {
        word: 'stars',
        phonetic: '/stɑː(r)z/',
        pos: 'n.',
        meaning: '星；恒星（star 的复数）',
        example: 'The stars are bright tonight.',
        exampleZh: '今晚的星星很亮。',
      },
    ],
  },
  {
    id: 'p2',
    en: 'Look how they shine for you',
    zh: '它们为你而闪耀',
    time: '01:24',
    words: [
      {
        word: 'shine',
        phonetic: '/ʃaɪn/',
        pos: 'v.',
        meaning: '发光；闪耀；照耀',
        example: 'The sun shines brightly.',
        exampleZh: '阳光灿烂。',
      },
    ],
  },
  {
    id: 'p3',
    en: 'And everything you do',
    zh: '你所做的一切',
    time: '01:31',
    words: [
      {
        word: 'everything',
        phonetic: '/ˈevriθɪŋ/',
        pos: 'pron.',
        meaning: '每件事；一切；所有事物',
        example: 'Everything is fine.',
        exampleZh: '一切都好。',
      },
    ],
  },
  {
    id: 'p4',
    en: 'Yeah, they were all yellow',
    zh: '是的，它们都是黄色的',
    time: '01:38',
    words: [
      {
        word: 'yellow',
        phonetic: '/ˈjeləʊ/',
        pos: 'adj.',
        meaning: '黄色的；胆怯的',
        example: 'The leaves turn yellow in autumn.',
        exampleZh: '秋天树叶变黄。',
      },
    ],
  },
];

export const lyrics: Lyric[] = [
  { id: 'l1', en: 'We were just kids when we fell in love', zh: '我们坠入爱河时还只是孩子', time: '0:12' },
  { id: 'l2', en: 'Not knowing what it was', zh: '并不知道那究竟是什么', time: '0:18' },
  { id: 'l3', en: 'I will not give you up this time', zh: '这一次我不会放开你', time: '0:24' },
  { id: 'l4', en: 'But darling, just kiss me slow', zh: '但亲爱的，只需慢慢吻我', time: '0:31' },
  { id: 'l5', en: 'Your heart is all I own', zh: '你的心是我拥有的全部', time: '0:38' },
  { id: 'l6', en: 'And in your eyes, you are holding mine', zh: '而在你眼中，你握着我的目光', time: '0:45' },
];

export type Vocab = {
  id: string;
  word: string;
  /** 英式音标 */
  phoneticUk: string;
  /** 美式音标 */
  phoneticUs: string;
  pos: string;
  meaning: string;
  /** 例句，句中的目标词会被高亮 */
  example: string;
  /** 例句中文翻译 */
  exampleZh: string;
  /** 是否已学习（进入页面时的初始状态） */
  learned?: boolean;
};

/** 本首歌（Yellow · Coldplay）的重点词汇 */
export const vocabList: Vocab[] = [
  { id: 'v1', word: 'shine', phoneticUk: '/ʃaɪn/', phoneticUs: '/ʃaɪn/', pos: 'v.', meaning: '发光；照耀；使有光泽', example: 'The stars shine in the night sky.', exampleZh: '星星在夜空中闪耀。', learned: true },
  { id: 'v2', word: 'yellow', phoneticUk: '/ˈjeləʊ/', phoneticUs: '/ˈjeloʊ/', pos: 'adj.', meaning: '黄色的；胆怯的', example: 'The moon looks yellow tonight.', exampleZh: '今晚的月亮看起来是黄色的。', learned: true },
  { id: 'v3', word: 'wonder', phoneticUk: '/ˈwʌndə(r)/', phoneticUs: '/ˈwʌndər/', pos: 'v.', meaning: '想知道；惊讶；感到疑惑', example: 'I wonder what he is doing.', exampleZh: '我想知道他在做什么。' },
  { id: 'v4', word: 'hope', phoneticUk: '/həʊp/', phoneticUs: '/hoʊp/', pos: 'n.', meaning: '希望；期望', example: 'Hope keeps us going.', exampleZh: '希望让我们继续前进。' },
  { id: 'v5', word: 'stars', phoneticUk: '/stɑːz/', phoneticUs: '/stɑːrz/', pos: 'n.', meaning: '星星；恒星（star 的复数）', example: 'We looked up at the stars.', exampleZh: '我们抬头望着星星。', learned: true },
  { id: 'v6', word: 'glow', phoneticUk: '/ɡləʊ/', phoneticUs: '/ɡloʊ/', pos: 'v.', meaning: '发光；发热；洋溢', example: 'The embers glow in the dark.', exampleZh: '余烬在黑暗中发着光。', learned: true },
  { id: 'v7', word: 'bright', phoneticUk: '/braɪt/', phoneticUs: '/braɪt/', pos: 'adj.', meaning: '明亮的；鲜艳的；聪明的', example: 'Her eyes are bright with joy.', exampleZh: '她的眼睛里闪着喜悦的光。', learned: true },
  { id: 'v8', word: 'skin', phoneticUk: '/skɪn/', phoneticUs: '/skɪn/', pos: 'n.', meaning: '皮肤；外皮；外壳', example: 'Warm sunlight on my skin.', exampleZh: '温暖的阳光洒在我的皮肤上。' },
  { id: 'v9', word: 'bones', phoneticUk: '/bəʊnz/', phoneticUs: '/boʊnz/', pos: 'n.', meaning: '骨头；骨骼（bone 的复数）', example: 'He broke two bones in his arm.', exampleZh: '他手臂上断了两根骨头。' },
  { id: 'v10', word: 'tide', phoneticUk: '/taɪd/', phoneticUs: '/taɪd/', pos: 'n.', meaning: '潮汐；浪潮；趋势', example: 'The tide comes in at noon.', exampleZh: '中午时分涨潮了。' },
  { id: 'v11', word: 'swim', phoneticUk: '/swɪm/', phoneticUs: '/swɪm/', pos: 'v.', meaning: '游泳；游动；旋转', example: 'We swim across the river together.', exampleZh: '我们一起游过这条河。' },
  { id: 'v12', word: 'cross', phoneticUk: '/krɒs/', phoneticUs: '/krɔːs/', pos: 'v.', meaning: '穿过；越过；交叉', example: 'I cross the bridge every morning.', exampleZh: '我每天早上都经过这座桥。' },
];

/** 听力练习：听音选词（正确答案是 listenOptions 里的 'a'） */
export const listenQuestion = 'I drew a line and ______ it.';

export const listenOptions = [
  { id: 'a', text: 'crossed' },
  { id: 'b', text: 'closed' },
  { id: 'c', text: 'called' },
  { id: 'd', text: 'caused' },
];

export type ShadowSentence = { id: string; en: string; zh: string; score: number };

export const shadowSentences: ShadowSentence[] = [
  { id: 'sh1', en: 'Look at the stars', zh: '看看天上的星星', score: 88 },
  { id: 'sh2', en: 'Look how they shine for you', zh: '看它们为你闪耀', score: 90 },
  { id: 'sh3', en: "I've been waiting for you", zh: '我一直在等你', score: 92 },
  { id: 'sh4', en: 'And everything you do', zh: '还有你做的一切', score: 85 },
  { id: 'sh5', en: 'Yeah, they were all yellow', zh: '是的，它们全是黄色的', score: 89 },
];

export const aiInsights = [
  { id: 'i1', title: '连读现象', body: 'blinding lights 连读为 /blaɪndɪn laɪts/' },
  { id: 'i2', title: '词汇用法', body: 'blinding 作形容词，表示“刺眼的”' },
  { id: 'i3', title: '语法结构', body: 'be blinded by 被动结构，表示“被…刺眼”' },
  { id: 'i4', title: '文化背景', body: '合成器复古风，80 年代流行音乐回潮' },
];
