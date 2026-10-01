import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { nowPlaying, playingLyrics } from '../data/mock';
import {
  LyricLine,
  MusicApi,
  MusicSong,
  ExamPointEntry,
  formatMillis,
  parseLyricLines,
} from '../services/musicApi';
import { musicPlayer } from '../services/player/musicPlayer';
import { useMusicPlayer } from '../hooks/useMusicPlayer';
import { useAppleMusicSubscription } from '../hooks/useAppleMusicSubscription';
import { openAppleMusicSubscribe } from '../services/appleMusic';
import { accountIdOf, recordRecentPlay } from '../services/recentPlays';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../utils/toast';
import { parseExamContent } from '../utils/examContent';
import { WordLookupCard } from '../components/WordLookupCard';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TABS = ['歌词', '学习要点'];

/** 考点类型对应的主题色（学习要点面板为白底，深色下用半透明底 + 亮色字） */
const TYPE_THEME: Record<string, { bg: string; fg: string }> = {
  重点词: { bg: 'rgba(91,108,217,0.22)', fg: '#A7B2F0' },
  重点短语: { bg: 'rgba(46,196,164,0.20)', fg: '#5FE3C0' },
  重点句子: { bg: 'rgba(245,166,35,0.22)', fg: '#F5C542' },
};
/** 白底模式下的深色字配色（对比度更高） */
const TYPE_THEME_LIGHT: Record<string, { bg: string; fg: string }> = {
  重点词: { bg: 'rgba(91,108,217,0.12)', fg: '#3A47A0' },
  重点短语: { bg: 'rgba(46,196,164,0.14)', fg: '#0F8A6E' },
  重点句子: { bg: 'rgba(245,166,35,0.16)', fg: '#B5790A' },
};
const DEFAULT_THEME = { bg: 'rgba(255,255,255,0.12)', fg: 'rgba(255,255,255,0.78)' };
const DEFAULT_THEME_LIGHT = { bg: 'rgba(0,0,0,0.06)', fg: '#555' };
const typeTheme = (t?: string, light = false) =>
  (t && (light ? TYPE_THEME_LIGHT : TYPE_THEME)[t]) ||
  (light ? DEFAULT_THEME_LIGHT : DEFAULT_THEME);

/** 歌词行最小高度（仅是视觉用；滚动定位已改成 onLayout 实测，不再拿它算位置） */
const LYRIC_LINE_HEIGHT = 72;

/** 讲解正文里出现的词条加粗，方便一眼定位重点词 */
const highlightItem = (text: string, item?: string) => {
  const word = (item || '').trim();
  if (!word || word.length > 40) return text;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  if (parts.length < 2) return text;
  return parts.map((part, i) =>
    part.toLowerCase() === word.toLowerCase() ? (
      <Text key={i} style={styles.examHi}>
        {part}
      </Text>
    ) : (
      part
    ),
  );
};

/**
 * 学习要点讲解：后端下发的是整段纯文本，这里按解析结果分区渲染——
 * 普通段落 / 搭配清单 / 注意事项 / 编号例句，避免「一堵墙」。
 *
 * 每段长文本都渲染成「卡片的直接 Text 子节点」（与普通段落同构）：
 * 只有这种结构在真机上会按卡片宽度折行；一旦套上一层 View（行内图标 + flex:1
 * 文本的写法），长文本就拿不到可用宽度，会整行溢出、被外层面板裁掉。
 * 因为返回值是平铺的节点数组，所以每项都要带 key。
 */
const renderExamDetail = (e: ExamPointEntry) => {
  const segments = parseExamContent(e.content);
  if (!segments.length) return null;
  const nodes: React.ReactNode[] = [];

  segments.forEach((seg, i) => {
    if (seg.kind === 'para') {
      nodes.push(
        <Text style={styles.examPara} key={`para-${i}`}>
          {highlightItem(seg.text, e.item)}
        </Text>,
      );
      return;
    }

    if (seg.kind === 'list') {
      nodes.push(
        <Text style={styles.examSectionLabel} key={`list-${i}`}>
          {seg.title}
        </Text>,
      );
      seg.items.forEach((it, j) => {
        nodes.push(
          <Text style={styles.examListItem} key={`list-${i}-${j}`}>
            <Text style={styles.examListBullet}>{'·  '}</Text>
            <Text style={styles.examListTerm}>{it.term}</Text>
            {it.gloss ? <Text style={styles.examListGloss}>{`　${it.gloss}`}</Text> : null}
          </Text>,
        );
      });
      return;
    }

    if (seg.kind === 'note') {
      // 注意 / 易错点：整块就是一个 Text，背景/边框/内边距都挂在 Text 上，
      // 图标 + 小标题占一行，讲解正文紧随其后换行
      nodes.push(
        <Text style={styles.examNote} key={`note-${i}`}>
          <Ionicons name="alert-circle-outline" size={13} color="#C79A2A" />
          <Text style={styles.examNoteTitle}>{`  ${seg.title}\n`}</Text>
          {highlightItem(seg.text, e.item)}
        </Text>,
      );
      return;
    }

    nodes.push(
      <Text style={styles.examSectionLabel} key={`eg-${i}`}>
        例句
      </Text>,
    );
    seg.items.forEach((it, j) => {
      nodes.push(
        <Text style={styles.examEgEn} key={`eg-${i}-${j}`}>
          <Text style={styles.examEgIndex}>{`${j + 1}  `}</Text>
          {highlightItem(it.en, e.item)}
        </Text>,
      );
      if (it.zh) {
        nodes.push(
          <Text style={styles.examEgZh} key={`eg-${i}-${j}-zh`}>
            {it.zh}
          </Text>,
        );
      }
    });
  });

  return nodes;
};

type OpenFn = (name: string, params?: Record<string, any>) => void;

interface Props {
  /** song：当前歌曲；playlist：所在歌单的歌曲列表（用于上一首/下一首）；index：起点 */
  params?: Record<string, any>;
  onOpen?: OpenFn;
  onBack: () => void;
}

/** 示例模式（mock 数据）下的假进度，只为 UI 好看 */
const DEMO_DURATION = 266000;
const DEMO_POSITION = Math.floor(DEMO_DURATION * 0.32);

/** 没有带歌曲进来的示例入口（首页 / 我的音乐）用的演示歌词 */
const DEMO_LINES: LyricLine[] = playingLyrics.map((l) => {
  const [m, s] = l.time.split(':');
  return {
    seconds: Number(m) * 60 + Number(s),
    time: l.time,
    en: l.en,
    zh: l.zh,
  };
});

export const PlayerScreen: React.FC<Props> = ({ params, onOpen, onBack }) => {
  /** 深色沉浸页：顶部避开状态栏、底部避开 Home Indicator */
  const insets = useSafeAreaInsets();
  const song = params?.song as MusicSong | undefined;
  const playlist = useMemo<MusicSong[]>(
    () => (Array.isArray(params?.playlist) ? (params.playlist as MusicSong[]) : []),
    [params?.playlist],
  );
  const collectionName = String(params?.collectionName || '');

  const [index, setIndex] = useState(() => {
    const fromParams = Number(params?.index);
    if (playlist.length && fromParams >= 0 && fromParams < playlist.length) return fromParams;
    const found = playlist.findIndex((s) => s.id === song?.id);
    return found >= 0 ? found : 0;
  });

  const current = playlist[index] ?? song;
  /** 示例模式：没带真实歌曲进来，用 mock 数据顶上（首页 / 我的音乐的演示入口） */
  const isDemo = !current;

  /** 播放状态统一从 musicPlayer 来，页面不再自己引 expo-av / MusicKit */
  const player = useMusicPlayer();
  const subscription = useAppleMusicSubscription();
  /** 最近播放按账号分区，读取当前登录用户 id */
  const { user } = useAuth();
  const [repeat, setRepeat] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  /** 标记本歌「学习完成」：初始值取自服务端回填的 learned（切歌时会重新同步） */
  const [done, setDone] = useState(() => Boolean(current?.learned));
  const [tab, setTab] = useState('歌词');
  /** 歌词 tab 下是否显示下方中文译文（记住用户选择） */
  const [showZh, setShowZh] = useState(true);
  /** 启动后读取持久化的译文显隐偏好 */
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem('player_show_zh')
      .then((v) => {
        if (alive && v != null) setShowZh(v !== '0');
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  /** 译文显隐变化即写回本地，下次进播放页沿用 */
  useEffect(() => {
    AsyncStorage.setItem('player_show_zh', showZh ? '1' : '0').catch(() => {});
  }, [showZh]);
  const [trackWidth, setTrackWidth] = useState(0);
  /** 示例模式没有音频，播放按钮只切个图标 */
  const [demoPlaying, setDemoPlaying] = useState(true);
  /** 点中的歌词单词：非空时弹出查词卡片 */
  const [lookupWord, setLookupWord] = useState<string | null>(null);

  const lyricRef = useRef<ScrollView | null>(null);
  /** 每行歌词在滚动内容里的真实 y（onLayout 量出来的），切歌 / 切 tab 会清空重建 */
  const lyricOffsets = useRef<number[]>([]);
  /** 歌词可视区高度，用来决定当前行停在偏上多少（不再写死 72px） */
  const lyricViewportH = useRef(0);
  /** 播完自动切歌时读的是最新状态，避免闭包里拿到旧值 */
  const infoRef = useRef({ index: 0, total: 0, shuffle: false, repeat: false });
  /** 用来识别「新的一次播完」 */
  const lastFinished = useRef(0);

  /** 学习要点翻页：当前页索引 / 每页宽度 / 横向滚动容器 */
  const pagerRef = useRef<ScrollView | null>(null);
  const [page, setPage] = useState(0);
  const [pageW, setPageW] = useState(0);

  const playing = isDemo ? demoPlaying : player.playing;

  const loadingAudio = !isDemo && player.loading;
  const audioError = isDemo ? '' : player.error;

  /** 整首歌时长（来自接口） */
  const songDuration = isDemo ? DEMO_DURATION : (current?.duration || 0) * 1000;
  /** 实际音频时长：试听时 30s，接全曲后就是整首歌 */
  const audioDuration = player.duration;
  const isPreview = !isDemo && player.source === 'preview';
  /**
   * 试听片段在整首歌里的起点（秒）。
   * Apple 的 30 秒片段起点由发行方指定、每首歌都不同，接口不下发就无从得知，
   * 这时歌词和音频根本没法对齐 —— 宁可不高亮，也不要高亮错的。
   */
  const previewStartSec =
    typeof current?.previewStartSec === 'number' ? current.previewStartSec : null;
  /** 歌词能不能跟音频对上：播全曲、或后端给了片段起点才行 */
  const aligned = !isPreview || previewStartSec !== null;
  /** 可听区间在整首歌时间轴上的 [起, 止] */
  const windowStart = isPreview ? (previewStartSec ?? 0) * 1000 : 0;
  const windowEnd =
    isPreview && audioDuration > 0 ? windowStart + audioDuration : songDuration || audioDuration;
  /**
   * 进度条走哪套时间轴：
   * 能对上就用整首歌（4:03），否则老实按片段本身（0:30）—— 不假装有整套歌的进度。
   */
  const timelineDuration = aligned ? songDuration : audioDuration || songDuration;
  const timelinePosition = isDemo
    ? DEMO_POSITION
    : aligned
      ? windowStart + player.position
      : player.position;

  const title = isDemo ? nowPlaying.title : current!.title;
  const artist = isDemo ? nowPlaying.artist : current!.artist;
  const coverUrl = isDemo ? '' : current!.coverUrl;

  const lines = useMemo(() => (isDemo ? DEMO_LINES : parseLyricLines(current)), [isDemo, current]);

  /** 学习要点：切歌时单独调接口拉取 /musics/{id}/exam_points，显示内容由返回数据决定 */
  const [examData, setExamData] = useState<ExamPointEntry[] | null>(null);
  const [examLoading, setExamLoading] = useState(false);
  useEffect(() => {
    if (isDemo || !current?.id) {
      setExamData(null);
      return;
    }
    let alive = true;
    setExamLoading(true);
    setExamData(null);
    MusicApi.getExamPoints(current.id)
      .then((data) => {
        if (alive) setExamData(data);
      })
      .catch(() => {
        if (alive) setExamData(null);
      })
      .finally(() => {
        if (alive) setExamLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [current?.id, isDemo]);

  /** 当前唱到哪一句：取最后一行 seconds 不超过播放进度的 */
  const activeLine = useMemo(() => {
    // 试听片段对不上歌词时不高亮：高亮一句错的比不高亮更糟
    if (!aligned || !lines.length) return -1;
    const seconds = timelinePosition / 1000;
    let found = -1;
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].seconds <= seconds + 0.2) found = i;
      else break;
    }
    return found;
  }, [lines, timelinePosition, aligned]);

  useEffect(() => {
    infoRef.current = { index, total: playlist.length, shuffle, repeat };
  }, [index, playlist.length, shuffle, repeat]);

  /** 切歌 / 播完：只改 index，真正起播由下面的加载 effect 负责 */
  const goTo = useCallback(
    (next: number) => {
      if (!playlist.length) return;
      const wrapped = ((next % playlist.length) + playlist.length) % playlist.length;
      setIndex(wrapped);
    },
    [playlist.length],
  );

  const handleFinish = useCallback(() => {
    const info = infoRef.current;
    if (info.repeat) {
      void musicPlayer.seek(0);
      void musicPlayer.play();
      return;
    }
    if (!info.total) return;
    const next = info.shuffle ? Math.floor(Math.random() * info.total) : info.index + 1;
    // 到末尾就停（播放器已经是「播完未播放」状态，不用额外处理）
    if (next >= info.total) return;
    setIndex(next);
  }, []);

  /**
   * 加载并播放当前歌曲。
   * 播放源由 musicPlayer 挑：现在只有试听片段，方案 B 接通后会自动走 Apple Music 全曲。
   */
  useEffect(() => {
    if (isDemo || !current) {
      void musicPlayer.release();
      return;
    }
    void musicPlayer.load(
      {
        id: String(current.id),
        title: current.title,
        url: current.url,
        appleId: current.appleId ? String(current.appleId) : undefined,
        duration: current.duration,
      },
      { autoPlay: true },
    );
    /** 记一笔「最近播放」，供首页展示；写失败不影响播放 */
    void recordRecentPlay(accountIdOf(user), current);
  }, [current?.id, current?.url, isDemo]);

  /** 离开播放页释放音频 */
  useEffect(
    () => () => {
      void musicPlayer.release();
    },
    [],
  );

  /** 播完一次：单曲循环就重头放，否则接下一首 */
  useEffect(() => {
    if (player.finishedCount === lastFinished.current) return;
    lastFinished.current = player.finishedCount;
    handleFinish();
  }, [player.finishedCount, handleFinish]);

  /**
   * 把第 line 行滚到可视区。
   * 位置一律用 onLayout 量出来的真实 y：写死行高会越滚越偏 ——
   * 「歌词」tab 一行约 53px，而「翻译」tab 只有 32px，估成 62 滚到中后段就会把当前行推上去看不见。
   */
  const scrollToLine = useCallback((line: number, animated: boolean) => {
    // 还没量到这一行就先不动，等它的 onLayout 回来自己纠一次
    const y = lyricOffsets.current[line];
    if (typeof y !== 'number') return;
    // 当前行停在可视区偏上（约 1/4 处），下方留出接下来的几句
    const anchor = lyricViewportH.current > 0 ? lyricViewportH.current * 0.25 : 72;
    lyricRef.current?.scrollTo({ y: Math.max(0, y - anchor), animated });
  }, []);

  /** 切 tab：两个 tab 的行高不一样，之前量出来的行位置作废，重新量 */
  useEffect(() => {
    lyricOffsets.current = [];
  }, [tab]);

  /** 歌词跟着播放进度滚；切译文显隐时整段行高变化，也要把当前行重新对位 */
  useEffect(() => {
    scrollToLine(activeLine, true);
  }, [activeLine, tab, showZh, scrollToLine]);

  /**
   * 切歌：歌词拉回顶部。
   * 新歌前奏里第一句还没到（activeLine 一直是 -1），光靠「跟着 activeLine 滚」触发不了，
   * 上一首停住的位置就会一直留着，看起来像没回到上方。
   */
  useEffect(() => {
    lyricOffsets.current = [];
    lyricRef.current?.scrollTo({ y: 0, animated: false });
  }, [current?.id]);

  /** 切歌重置翻页到第 1 个考点 */
  useEffect(() => {
    setPage(0);
  }, [examData]);

  /** 切歌时同步「完成」状态（取自服务端回填的 learned），避免沿用上一首的状态 */
  useEffect(() => {
    setDone(Boolean(current?.learned));
  }, [current?.id]);

  const togglePlay = async () => {
    // 示例模式没有音频，只切一下按钮状态
    if (isDemo) {
      setDemoPlaying((p) => !p);
      return;
    }
    await musicPlayer.toggle();
  };

  /** 按音频自身时间轴跳，进度条拖动用（片段就跳片段，不换算） */
  const seekAudio = async (ms: number) => {
    if (isDemo || !audioDuration) return;
    await musicPlayer.seek(Math.max(0, Math.min(ms, audioDuration)));
  };

  /** 点歌词：跳到「整首歌时间轴」上的 ms；片段起点未知时没法换算，只提示 */
  const seek = async (ms: number) => {
    if (isDemo) return;
    if (!aligned) {
      showToast('试听片段对不上歌词，订阅 Apple Music 后可点句跳转', 'info');
      return;
    }
    const available = windowEnd;
    // 超出可听区间就不跳（跳到末尾会直接触发「播完切下一首」，体验更差），只提示
    if (ms > available - 300) {
      showToast(
        `试听片段只有 ${formatMillis(audioDuration)}，订阅 Apple Music 听完整版`,
        'info',
      );
      return;
    }
    await musicPlayer.seek(Math.max(0, Math.min(ms, available) - windowStart));
  };

  const onSubscribe = async () => {
    const opened = await openAppleMusicSubscribe();
    if (!opened) showToast('暂时打不开订阅页，之后可以在首页再试', 'info');
  };

  /** 标记 / 取消「本歌学习完成」：调用服务端 /musics/{id}/learned */
  const toggleDone = async () => {
    const next = !done;
    // 先本地置位，体验更跟手
    setDone(next);
    // 演示 / 无真实歌曲：仅本地状态
    if (isDemo || !current?.id) {
      showToast(next ? '已标记为完成' : '已取消完成', 'success');
      return;
    }
    try {
      await MusicApi.markLearned(current.id, next);
      showToast(next ? '已标记为完成' : '已取消完成', 'success');
    } catch (e: any) {
      // 失败回滚本地状态
      setDone(!next);
      showToast(e?.message || '操作失败，请重试', 'info');
    }
  };

  const onTrackPress = (event: any) => {
    if (!trackWidth || !timelineDuration) return;
    const x = Number(event?.nativeEvent?.locationX ?? 0);
    const ms = (x / trackWidth) * timelineDuration;
    void (aligned ? seek(ms) : seekAudio(ms));
  };

  /** 进度（0~1），走的是上面选定的那套时间轴 */
  const progress = timelineDuration > 0 ? Math.min(1, timelinePosition / timelineDuration) : 0;
  /** 试听区间在整首歌里的占比，画在进度条上当示意 */
  const windowLeft = songDuration > 0 ? Math.min(1, windowStart / songDuration) : 0;
  const windowWidth =
    songDuration > 0 ? Math.min(1 - windowLeft, (windowEnd - windowStart) / songDuration) : 0;
  /** 只有在「对齐得了 + 片段明显短于整首歌」时才画可听区间 */
  const showWindow = aligned && isPreview && audioDuration > 0 && windowEnd < songDuration - 1000;

  /**
   * 把一行歌词拆成可点的单词：含字母的词加 onPress 查词，空格/标点原样输出。
   * 点击只查词、不冒泡到整行的「点歌词跳转」，避免查词时顺带跳转播放进度。
   */
  const renderWordSpans = (text: string) => {
    return text.split(/(\s+)/).map((part, i) => {
      const word = part.replace(/[^A-Za-z']/g, '');
      if (!word) return <Text key={`s-${i}`}>{part}</Text>;
      return (
        <Text
          key={`w-${i}`}
          onPress={(e: any) => {
            e?.stopPropagation?.();
            setLookupWord(word.toLowerCase());
          }}
        >
          {part}
        </Text>
      );
    });
  };

  const renderLyricLines = () => {
    if (!lines.length) {
      return (
        <View style={styles.emptyPanel}>
          <Ionicons name="document-text-outline" size={24} color={S.muted} />
          <Text style={styles.emptyText}>这首歌暂无歌词数据</Text>
        </View>
      );
    }
    /** 试听片段对不上歌词时，明确告诉用户为什么不跟随 */
    const banner = !aligned ? (
      <View style={styles.previewBanner}>
        <Ionicons name="information-circle-outline" size={13} color={S.gold} />
        <Text style={styles.previewBannerText}>
          试听片段歌词不跟随播放，订阅 Apple Music 后可逐句跟读
        </Text>
      </View>
    ) : null;

    return (
      <>
        {banner}
        <ScrollView
          ref={lyricRef}
          style={styles.lyricScroll}
          contentContainerStyle={styles.lyricBody}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          onLayout={(e) => {
            lyricViewportH.current = e.nativeEvent.layout.height;
            // 视口高度量到后锚点才算得准，把当前行按新锚点再摆一次
            scrollToLine(activeLine, false);
          }}
        >
          {lines.map((l, i) => {
          const on = i === activeLine;
          /** 试听区间之外的歌词听不到，压暗一点，点它会提示片段长度 */
          const outOfRange = showWindow && l.seconds * 1000 > windowEnd;
          const dimmed = outOfRange ? styles.dimmed : null;
          return (
            <View
              key={`${l.seconds}-${i}`}
              style={styles.lyricItem}
              onLayout={(e) => {
                lyricOffsets.current[i] = e.nativeEvent.layout.y;
                if (i === activeLine) scrollToLine(i, false);
              }}
            >
              <View style={styles.lyricHead}>
                {on ? <Ionicons name="stats-chart" size={13} color={S.gold} /> : null}
                {/* 单词可点查词。整行不再是点按容器，避免父级和单词抢手势
                    （之前点单词会被整行的 seek 吃掉，还弹「片段对不上歌词」的提示） */}
                <Text style={[styles.lyricEn, dimmed, on && styles.lyricEnOn]}>
                  {renderWordSpans(l.en)}
                </Text>
              </View>
              {showZh && l.zh ? (
                <Text style={[styles.lyricZh, dimmed, on && styles.lyricZhOn]}>{l.zh}</Text>
              ) : null}
            </View>
          );
          })}
        </ScrollView>
      </>
    );
  };

  /** 学习要点：一屏一个考点，左右翻页 + 进度点 + 上/下一词 */
  const renderExamPoints = () => {
    /** 学习要点面板是白底，考点分类标签 / 文案全部走深色配色 */
    const light = tab === '学习要点';
    if (examLoading) {
      return (
        <View style={styles.emptyPanel}>
          <ActivityIndicator size="small" color="#B7B7B7" />
          <Text style={[styles.emptyText, styles.emptyTextLight]}>学习要点加载中…</Text>
        </View>
      );
    }
    const list = examData;
    if (!list || !list.length) {
      return (
        <View style={styles.emptyPanel}>
          <Ionicons name="school-outline" size={24} color="#B7B7B7" />
          <Text style={[styles.emptyText, styles.emptyTextLight]}>本歌暂无学习要点</Text>
        </View>
      );
    }

    const total = list.length;
    const goToPage = (target: number) => {
      const p = Math.max(0, Math.min(target, total - 1));
      setPage(p);
      pagerRef.current?.scrollTo({ x: p * pageW, animated: true });
    };

    return (
      <View style={styles.examPager}>
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          style={styles.lyricScroll}
          contentContainerStyle={styles.examPagerTrack}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w && w !== pageW) setPageW(w);
          }}
          onMomentumScrollEnd={(e) => {
            if (pageW > 0) setPage(Math.round(e.nativeEvent.contentOffset.x / pageW));
          }}
        >
          {list.map((e, i) => {
            const theme = typeTheme(e.type, light);
            return (
              <View style={[styles.examPage, { width: pageW || undefined }]} key={i}>
                <ScrollView
                  style={styles.lyricScroll}
                  contentContainerStyle={styles.examPageInner}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  <View style={styles.examCard}>
                    <View style={styles.examCardHead}>
                      <View style={[styles.examCatTag, { backgroundColor: theme.bg }]}>
                        <Text style={[styles.examCatText, { color: theme.fg }]}>{e.type || '考点'}</Text>
                      </View>
                      {e.level ? (
                        <View style={styles.examLevelTag}>
                          <Ionicons name="ribbon-outline" size={12} color={S.gold} />
                          <Text style={styles.examLevelText}>{e.level}</Text>
                        </View>
                      ) : null}
                    </View>
                    {e.item ? <Text style={styles.examPointTitle}>{e.item}</Text> : null}
                    {e.source ? (
                      <Text style={styles.examExample}>{e.source}</Text>
                    ) : null}
                    {renderExamDetail(e)}
                  </View>
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.examDots}>
          {list.map((_, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.6}
              onPress={() => goToPage(i)}
              style={[styles.examDot, i === page && styles.examDotOn]}
            />
          ))}
        </View>

        <View style={styles.examNav}>
          <TouchableOpacity
            style={[styles.examNavBtn, page === 0 && styles.examNavBtnOff]}
            disabled={page === 0}
            onPress={() => goToPage(page - 1)}
          >
            <Ionicons name="chevron-back" size={16} color={page === 0 ? '#B7B7B7' : '#fff'} />
            <Text style={[styles.examNavText, page === 0 && styles.examNavTextOff]}>上一词</Text>
          </TouchableOpacity>
          <Text style={styles.examNavCount}>{`${page + 1} / ${total}`}</Text>
          <TouchableOpacity
            style={[styles.examNavBtn, page >= total - 1 && styles.examNavBtnOff]}
            disabled={page >= total - 1}
            onPress={() => goToPage(page + 1)}
          >
            <Text style={[styles.examNavText, page >= total - 1 && styles.examNavTextOff]}>下一词</Text>
            <Ionicons name="chevron-forward" size={16} color={page >= total - 1 ? '#B7B7B7' : '#fff'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPanel = () => {
    if (tab === '学习要点') return renderExamPoints();
    return renderLyricLines();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#1E2C4C', '#131E33', '#0A1122']}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(245,166,35,0.20)', 'rgba(245,166,35,0)']}
        start={{ x: 0.2, y: 0.1 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.glow}
      />

      {/* 顶部：返回 / 封面 / 歌名 + 作者 / 完成标记 合并一行，整体更矮 */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.cover} />
        ) : (
          <View style={styles.coverFallback}>
            <Ionicons name="musical-notes" size={20} color="rgba(255,255,255,0.82)" />
          </View>
        )}
        <View style={styles.headInfo}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {artist}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.doneBtn, done && styles.doneBtnOn]}
          onPress={toggleDone}
          activeOpacity={0.8}
        >
          <Ionicons
            name={done ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={18}
            color={done ? S.gold : '#fff'}
          />
          <Text style={[styles.doneText, done && styles.doneTextOn]}>{done ? '已完成' : '完成'}</Text>
        </TouchableOpacity>
      </View>

      {/* 分区：歌词 / 学习要点；歌词 tab 右侧可切换中文译文显隐 */}
      <View style={styles.segmentRow}>
        <View style={styles.segment}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.segItem, tab === t && styles.segItemOn]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.segText, tab === t && styles.segTextOn]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {tab === '歌词' ? (
          <TouchableOpacity
            style={styles.zhToggle}
            onPress={() => setShowZh((v) => !v)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={showZh ? 'eye-outline' : 'eye-off-outline'}
              size={16}
              color={S.textSub}
            />
            <Text style={styles.zhToggleText}>{showZh ? '隐藏译文' : '显示译文'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 中间：只有这一块滚动（歌词 / 学习要点）；学习要点为白底 */}
      <View style={[styles.panel, tab === '学习要点' && styles.panelLight]}>
        {renderPanel()}
      </View>

      {/* 底部：进度 + 播放控制（整体移到底部） */}
      <View style={styles.bottom}>
        {audioError ? <Text style={styles.audioError}>{audioError}</Text> : null}
        {/* 未订阅 Apple Music 时：说明现在播的是试听片段，给个去订阅入口 */}
        {!isDemo && subscription.status === 'eligible' && player.source === 'preview' ? (
          <TouchableOpacity style={styles.previewBar} onPress={onSubscribe} activeOpacity={0.85}>
            <Ionicons name="musical-notes-outline" size={14} color={S.gold} />
            <Text style={styles.previewText} numberOfLines={1}>
              试听片段 · 订阅 Apple Music 听完整版
            </Text>
            <Text style={styles.previewCta}>去订阅</Text>
          </TouchableOpacity>
        ) : null}

        {/* 进度条：点一下跳到对应位置 */}
        <View style={styles.progressWrap}>
          <TouchableOpacity
            style={styles.track}
            onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
            onPress={onTrackPress}
            activeOpacity={1}
          >
            {/* 可听区间：试听时只有这一段有声音 */}
            {showWindow ? (
              <View
                style={[
                  styles.window,
                  { left: `${windowLeft * 100}%`, width: `${windowWidth * 100}%` },
                ]}
              />
            ) : null}
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
            <View style={[styles.knob, { left: `${progress * 100}%` }]} />
          </TouchableOpacity>
          <View style={styles.timeRow}>
            <Text style={styles.time}>{formatMillis(timelinePosition)}</Text>
            {isPreview ? (
              <Text style={styles.previewHint}>
                {showWindow
                  ? `试听 ${formatMillis(audioDuration)} / 全曲 ${formatMillis(songDuration)}`
                  : `试听片段 · 全曲 ${formatMillis(songDuration)}`}
              </Text>
            ) : null}
            <Text style={styles.time}>{formatMillis(timelineDuration)}</Text>
          </View>
        </View>

        {/* 播放控制：上一曲 / 播放暂停 / 下一曲 + 随机 / 循环 */}
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={() => {
              const next = !shuffle;
              setShuffle(next);
              showToast(next ? '随机播放：已开启' : '随机播放：已关闭', 'info');
            }}
          >
            <Ionicons name="shuffle" size={19} color={shuffle ? S.gold : S.textSub} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => goTo(index - 1)} disabled={!playlist.length}>
            <Ionicons
              name="play-skip-back"
              size={24}
              color={playlist.length ? '#fff' : 'rgba(255,255,255,0.3)'}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.playBtn} onPress={togglePlay}>
            {loadingAudio ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name={playing ? 'pause' : 'play'} size={26} color="#fff" />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => goTo(index + 1)} disabled={!playlist.length}>
            <Ionicons
              name="play-skip-forward"
              size={24}
              color={playlist.length ? '#fff' : 'rgba(255,255,255,0.3)'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              const next = !repeat;
              setRepeat(next);
              showToast(next ? '单曲循环：已开启' : '单曲循环：已关闭', 'info');
            }}
          >
            <Ionicons name="repeat" size={19} color={repeat ? S.gold : S.textSub} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 点歌词中的单词 -> 查词卡片 */}
      <WordLookupCard wordName={lookupWord} onClose={() => setLookupWord(null)} />
    </View>
  );
};

/** 深色播放页局部色板 */
const S = {
  textSub: 'rgba(255,255,255,0.62)',
  muted: 'rgba(255,255,255,0.42)',
  gold: '#F5C542',
  accent: '#5B6CD9',
  line: 'rgba(255,255,255,0.12)',
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A1122' },
  glow: { position: 'absolute', top: 0, left: -28, width: 240, height: 240, borderRadius: 120 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
    gap: 12,
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  headRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, marginTop: 16 },
  cover: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
  },
  coverFallback: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverTop: { fontSize: 8, letterSpacing: 2, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  sunWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(245,166,35,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sun: { width: 74, height: 74, borderRadius: 37 },
  coverBottom: { fontSize: 8, letterSpacing: 2, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  headInfo: { flex: 1, marginLeft: 0 },
  songTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  songArtist: { fontSize: 12, color: S.textSub, marginTop: 4 },
  /** 右侧「完成 / 已完成」标记 */
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  doneBtnOn: { backgroundColor: 'rgba(245,197,66,0.16)', borderColor: S.gold },
  doneText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  doneTextOn: { color: S.gold },
  songAlbum: { fontSize: 11, color: S.muted, marginTop: 4 },
  tagRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  levelTag: { backgroundColor: S.accent, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  levelText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  genreTag: {
    borderWidth: 1,
    borderColor: S.line,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  genreText: { fontSize: 10, color: S.textSub },
  desc: { fontSize: 11, lineHeight: 16, color: S.muted, marginTop: 10 },
  /** 底部固定区：进度 + 播放控制，整体贴底 */
  bottom: { paddingTop: 6, paddingBottom: 12, paddingHorizontal: 18 },
  progressWrap: { marginTop: 6 },
  track: { height: 14, justifyContent: 'center' },
  fill: { height: 3, borderRadius: 2, backgroundColor: '#A7B2F0' },
  knob: {
    position: 'absolute',
    top: 1.5,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  time: { fontSize: 11, color: S.muted },
  audioError: { fontSize: 11, color: '#FF9B9B', paddingHorizontal: 18, marginTop: 6 },
  /** 试听片段在整首歌里的可听区间 */
  window: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  previewHint: { fontSize: 10.5, color: S.muted },
  dimmed: { opacity: 0.38 },
  /** 试听对不上歌词时的说明条 */
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  previewBannerText: { flex: 1, fontSize: 11, color: S.textSub, lineHeight: 15 },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginHorizontal: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(245,197,66,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,197,66,0.28)',
  },
  previewText: { flex: 1, fontSize: 11.5, color: 'rgba(255,255,255,0.78)' },
  previewCta: { fontSize: 12, fontWeight: '700', color: S.gold },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  playBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: S.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** 分区条 + 右侧译文切换：同处一行，整体左右留白归到 segmentRow */
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginHorizontal: 18,
    gap: 12,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 4,
  },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
  segItemOn: { backgroundColor: 'rgba(255,255,255,0.13)' },
  segText: { fontSize: 13, color: S.muted },
  segTextOn: { color: '#fff', fontWeight: '700' },
  /** 歌词 tab 右侧：切换中文译文显隐 */
  zhToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  zhToggleText: { fontSize: 12, color: S.textSub },
  panel: {
    flex: 1,
    marginTop: 12,
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  /** 学习要点：白底面板 */
  panelLight: { backgroundColor: '#FFFFFF' },
  lyricScroll: { flex: 1 },
  lyricBody: { paddingBottom: 12 },
  lyricItem: { paddingVertical: 6, minHeight: LYRIC_LINE_HEIGHT - 12 },
  lyricHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  lyricEn: { flex: 1, fontSize: 17, fontWeight: '600', color: 'rgba(255,255,255,0.86)', lineHeight: 24 },
  lyricEnOn: { fontSize: 17.5, fontWeight: '700', color: '#fff', lineHeight: 24 },
  lyricZh: { fontSize: 14, color: S.muted, marginTop: 5, lineHeight: 20 },
  lyricZhOn: { color: 'rgba(255,255,255,0.66)', marginLeft: 20, lineHeight: 20 },
  learnPanel: { paddingVertical: 8 },
  learnCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: S.accent,
    borderRadius: 10,
    paddingVertical: 12,
  },
  learnCtaText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  learnHint: { fontSize: 11, lineHeight: 17, color: S.muted, marginTop: 12 },
  emptyPanel: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 13, color: S.muted },
  /** 白底面板下的空态文案 */
  emptyTextLight: { color: '#999' },
  /** 学习要点 */
  examBody: { paddingBottom: 16, gap: 12 },
  examSummaryCard: {
    backgroundColor: 'rgba(245,197,66,0.14)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,197,66,0.5)',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  examLevelTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 22,
    backgroundColor: 'rgba(245,197,66,0.16)',
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  examLevelText: { fontSize: 11, fontWeight: '700', color: '#9A6B00' },
  examSummary: { fontSize: 13, lineHeight: 20, color: '#3D3D3D' },
  examCard: {
    backgroundColor: '#F6F7FB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  examCardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  examCatTag: {
    height: 22,
    justifyContent: 'center',
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  examCatText: { fontSize: 10.5, fontWeight: '700', lineHeight: 14 },
  examPointTitle: {
    marginTop: 8,
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  /** 歌词原句：整块是一个 Text，左侧竖线用 border 画，长句随卡片宽度折行 */
  examExample: {
    marginTop: 10,
    paddingLeft: 9,
    borderLeftWidth: 3,
    borderLeftColor: S.accent,
    borderRadius: 2,
    fontSize: 12.5,
    lineHeight: 18,
    fontStyle: 'italic',
    color: '#555',
  },
  /** 讲解正文：普通段落 */
  examPara: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 21,
    color: '#5A6070',
  },
  /** 正文里高亮的词条 */
  examHi: { color: '#2E3A63', fontWeight: '700' },
  /** 分区小标题（常见搭配 / 例句） */
  examSectionLabel: {
    marginTop: 13,
    marginBottom: 7,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#6B7180',
  },
  /** 搭配清单：一条一行，项目符号写在行内，长词条才会折行 */
  examListItem: { marginTop: 5, fontSize: 12.5, lineHeight: 20, color: '#1F2430' },
  examListBullet: { color: '#B9C0D4' },
  examListTerm: { fontWeight: '700', color: '#1F2430' },
  examListGloss: { color: '#7A8090' },
  /** 注意事项提示框：整块用一个 Text 渲染（背景/边框/内边距挂在 Text 上） */
  examNote: {
    marginTop: 13,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(245,197,66,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245,197,66,0.34)',
    fontSize: 12.5,
    lineHeight: 20,
    color: '#6E5A22',
  },
  examNoteTitle: { fontSize: 11.5, lineHeight: 17, fontWeight: '800', color: '#9A6B00' },
  /** 编号例句：序号写在行内，长句折行 */
  examEgEn: { marginTop: 9, fontSize: 12.5, lineHeight: 19, color: '#2A2F3A' },
  examEgIndex: { fontSize: 11, fontWeight: '800', color: '#5B6CD9' },
  examEgZh: {
    marginTop: 3,
    paddingLeft: 16,
    fontSize: 12,
    lineHeight: 18,
    color: '#71767F',
  },
  /** 学习要点翻页：一屏一个考点 */
  examPager: { flex: 1 },
  examPagerTrack: {},
  examPage: { height: '100%' },
  examPageInner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 18,
  },
  examDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 9,
  },
  examDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.16)' },
  examDotOn: { width: 16, backgroundColor: S.gold },
  examNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  examNavBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 10 },
  examNavBtnOff: { opacity: 0.4 },
  examNavText: { fontSize: 13, fontWeight: '700', color: '#3A3A3A' },
  examNavTextOff: { color: '#B7B7B7' },
  examNavCount: { fontSize: 12.5, fontWeight: '700', color: 'rgba(0,0,0,0.5)' },
});
