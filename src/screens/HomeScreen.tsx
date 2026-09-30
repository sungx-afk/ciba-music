import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { MusicApi, MusicCollection, formatDuration } from '../services/musicApi';
import { RecentPlayItem, toMusicSong } from '../services/recentPlays';
import { fetchNotebookStats, NotebookStats } from '../services/bookmarkApi';
import { useRecentPlays } from '../hooks/useRecentPlays';
import { useProgress } from '../storage/progressStore';
import { useAuth } from '../context/AuthContext';
import { AppleMusicPrompt } from '../components/AppleMusicPrompt';
import { ConfirmDialog } from '../components/ConfirmDialog';

type OpenFn = (name: string, params?: Record<string, any>) => void;

/**
 * 没封面时的兜底渐变：按歌名哈希稳定挑一组，保证同一首歌每次颜色一致。
 * 色值取自主题里的蓝 / 青 / 紫 / 金 / 薄荷 / 灰蓝，整体和 App 配色统一。
 */
const COVER_GRADIENTS: [string, string][] = [
  ['#6D8BFF', '#2A5FE0'],
  ['#5AC8E8', '#1C7EA8'],
  ['#8F7FFF', '#5B45E0'],
  ['#F7C65C', '#D9860B'],
  ['#7BE0BE', '#12A183'],
  ['#A9B6CC', '#5A6B85'],
];

function coverGradient(seed: string): [string, string] {
  let sum = 0;
  for (let i = 0; i < seed.length; i += 1) sum += seed.charCodeAt(i);
  return COVER_GRADIENTS[sum % COVER_GRADIENTS.length];
}

/** 兜底封面上的首字母 */
function coverLetter(title: string): string {
  const t = (title || '').trim();
  return t ? t.charAt(0).toUpperCase() : '♪';
}

/** 按当前小时段返回问候语（前端本地算，无需接口） */
function greetingByHour(hour: number): { text: string; emoji: string } {
  if (hour >= 5 && hour < 12) return { text: 'Good morning', emoji: '👋' };
  if (hour >= 12 && hour < 18) return { text: 'Good afternoon', emoji: '☀️' };
  return { text: 'Good evening', emoji: '🌙' };
}

export const HomeScreen: React.FC<{ onOpen: OpenFn; onSwitchTab?: (tab: string) => void }> = ({
  onOpen,
  onSwitchTab,
}) => {
  /** 真机状态栏会压住问候语，顶部留出安全区（底部由 TabBar 负责） */
  const insets = useSafeAreaInsets();
  /** 登录态：生词本卡片按登录与否展示不同内容 */
  const { isLoggedIn } = useProgress();
  const { isLoading: authLoading } = useAuth();
  /** 「生词本」卡片数据：学习目标 / 已学习 / 总数量 */
  const [notebook, setNotebook] = useState<NotebookStats | null>(null);
  const [loadingNotebook, setLoadingNotebook] = useState(false);
  /** 生词本统计请求代次，避免旧结果覆盖新结果 */
  const notebookReqRef = useRef(0);
  const [collections, setCollections] = useState<MusicCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  /** 最近播放：自己订阅变更，播放页写入后这里自动刷新 */
  const recent = useRecentPlays();
  const [showClearRecent, setShowClearRecent] = useState(false);

  /** 未登录（且登录态已确定）：精选歌单区统一引导登录、不展示任何歌单数据 */
  const showLoginGate = !authLoading && !isLoggedIn;

  /** 顶部问候语随时间段变化：上午 / 下午 / 晚上，每分钟校准一次 */
  const [greeting, setGreeting] = useState(() => greetingByHour(new Date().getHours()));
  useEffect(() => {
    const id = setInterval(() => setGreeting(greetingByHour(new Date().getHours())), 60_000);
    return () => clearInterval(id);
  }, []);

  /** 顶部搜索框输入：空 → 正常首页；非空 → 本地过滤精选歌单（后续替换为接口搜索） */
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return collections.filter((c) => `${c.name} ${c.description}`.toLowerCase().includes(q));
  }, [query, collections]);

  const load = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      const list = await MusicApi.getCollections();
      setCollections(list);
    } catch (e: any) {
      setError(e?.message || '歌单加载失败，请稍后重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /** 未登录不拉精选歌单数据：避免无谓请求，也满足「未登录不展示歌单」 */
  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      setCollections([]);
      setLoading(false);
      setError('');
      return;
    }
    void load();
  }, [authLoading, isLoggedIn, load]);

  /** 生词本统计：学习目标 = day_limit、已学习 = today_learned_card_count、总数量 = card_count */
  const loadNotebook = useCallback(async () => {
    const req = ++notebookReqRef.current;
    setLoadingNotebook(true);
    try {
      const stats = await fetchNotebookStats();
      if (req !== notebookReqRef.current) return;
      setNotebook(stats);
    } catch {
      if (req !== notebookReqRef.current) return;
      setNotebook(null);
    } finally {
      setLoadingNotebook(false);
    }
  }, []);

  /** 登录态/账号变化后刷新生词本数据；未登录时清空，避免串账号 */
  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      notebookReqRef.current += 1;
      setNotebook(null);
      setLoadingNotebook(false);
      return;
    }
    void loadNotebook();
  }, [authLoading, isLoggedIn, loadNotebook]);

  const openCollection = (item: MusicCollection) => {
    onOpen('Collection', {
      collectionId: item.id,
      collectionName: item.name,
      coverUrl: item.coverUrl,
      songCount: item.songCount,
      type: item.type,
    });
  };

  /** 从最近播放直接回到播放页：记录里已带 url / appleId，可以直接起播 */
  const openRecent = (item: RecentPlayItem) => {
    const song = toMusicSong(item);
    onOpen('Player', { song, playlist: [song] });
  };

  /** 歌单卡片：首页「精选歌单」与搜索结果共用 */
  const renderCollectionCard = (item: MusicCollection) => (
    <TouchableOpacity
      key={item.id}
      style={styles.collectionCard}
      activeOpacity={0.85}
      onPress={() => openCollection(item)}
    >
      {item.coverUrl ? (
        <Image source={{ uri: item.coverUrl }} style={styles.cover} />
      ) : (
        <LinearGradient colors={['#8FB2FF', '#3D5AFE']} style={[styles.cover, styles.coverFallback]}>
          <Ionicons name="musical-notes" size={22} color="rgba(255,255,255,0.9)" />
        </LinearGradient>
      )}
      <View style={styles.collectionInfo}>
        <Text style={styles.collectionName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.collectionDesc} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.countTag}>
            <Ionicons name="musical-note" size={10} color={Colors.blueDeep} />
            <Text style={styles.countText}>{item.songCount} 首</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );

  /** 未登录：精选歌单 / 搜索结果统一引导登录（点一下进登录页） */
  const renderCollectionLoginGate = () => (
    <TouchableOpacity
      style={[styles.stateBox, styles.loginGateBox]}
      activeOpacity={0.9}
      onPress={() => onOpen('Login')}
    >
      <Ionicons name="lock-closed-outline" size={26} color={Colors.textMuted} />
      <Text style={styles.stateText}>登录后可查看精选歌单</Text>
      <View style={styles.loginGateBtn}>
        <Text style={styles.loginGateBtnText}>去登录</Text>
      </View>
    </TouchableOpacity>
  );

  /** 生词本指标：学习目标 / 已学习 / 总数量，一行三列、竖线分隔 */
  const renderNotebookMetric = (label: string, value: number | string, accent: string) => (
    <View style={styles.metricItem}>
      <Text style={[styles.metricValue, { color: accent }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );

  /** 生词本卡片（原「用音乐学英语」入口位）：标题行 + 三格指标 + 进入生词本入口 */
  const renderNotebookCard = () => {
    const dayLimit = notebook?.dayLimit ?? 0;
    const learned = notebook?.learnedToday ?? 0;
    const progress = dayLimit ? Math.min(1, learned / dayLimit) : 0;

    if (authLoading) {
      return (
        <View style={styles.notebookCard}>
          <View style={styles.loginStateWrap}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loginStateDesc}>正在读取登录状态…</Text>
          </View>
        </View>
      );
    }

    if (!isLoggedIn) {
      return (
        <TouchableOpacity
          style={styles.notebookCard}
          activeOpacity={0.9}
          onPress={() => onOpen('Login')}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Ionicons name="book" size={17} color="#FFFFFF" />
            </View>
            <View style={styles.cardTitleWrap}>
              <Text style={styles.cardTitle}>生词本</Text>
              <Text style={styles.cardSubtitle}>登录后开始今日学习</Text>
            </View>
            <View style={styles.unloginTag}>
              <Ionicons name="person-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.unloginTagText}>未登录</Text>
            </View>
          </View>
          <View style={styles.unloginHintRow}>
            <Ionicons name="lock-closed-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.unloginHintText}>登录后查看今日目标与生词本进度</Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.notebookCard}
        activeOpacity={0.9}
        onPress={() => onSwitchTab?.('Bookmarks')}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <Ionicons name="book" size={17} color="#FFFFFF" />
          </View>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.cardTitle}>生词本</Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {loadingNotebook
                ? '正在获取生词本数据…'
                : notebook
                ? `今日目标 ${dayLimit} 个单词 · 共 ${notebook.totalWords} 词`
                : '生词本数据获取失败'}
            </Text>
          </View>
          {!loadingNotebook && dayLimit ? (
            <View style={styles.percentBadge}>
              <Text style={styles.percentBadgeText}>{Math.round(progress * 100)}%</Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={17} color={Colors.textMuted} />
        </View>

        <View style={styles.notebookMetrics}>
          {renderNotebookMetric('学习目标', notebook?.dayLimit ?? '-', Colors.primary)}
          <View style={styles.metricDivider} />
          {renderNotebookMetric('已学习', notebook?.learnedToday ?? '-', Colors.textPrimary)}
          <View style={styles.metricDivider} />
          {renderNotebookMetric('总数量', notebook?.totalWords ?? '-', Colors.accent)}
        </View>

        <View style={styles.primaryCta}>
          <Ionicons name="book-outline" size={16} color={Colors.primary} />
          <Text style={styles.primaryCtaText}>进入生词本，开始今日学习</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  /** 精选歌单内容：未登录显示登录引导；已登录显示加载 / 错误 / 列表 */
  const collectionsContent = showLoginGate ? (
    renderCollectionLoginGate()
  ) : (
    <View>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>精选歌单</Text>
        {collections.length > 0 ? (
          <Text style={styles.sectionCount}>共 {collections.length} 个</Text>
        ) : null}
      </View>
      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={Colors.blue} />
          <Text style={styles.stateText}>正在加载歌单…</Text>
        </View>
      ) : null}
      {!loading && error ? (
        <View style={styles.stateBox}>
          <Ionicons name="cloud-offline-outline" size={26} color={Colors.textMuted} />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>重新加载</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {!loading && !error && collections.length === 0 ? (
        <View style={styles.stateBox}>
          <Ionicons name="musical-notes-outline" size={26} color={Colors.textMuted} />
          <Text style={styles.stateText}>暂无歌单</Text>
        </View>
      ) : null}
      {!loading && !error ? collections.map(renderCollectionCard) : null}
    </View>
  );

  /** 搜索结果内容：未登录同样引导登录，不展示任何歌单数据 */
  const searchContent = showLoginGate ? (
    renderCollectionLoginGate()
  ) : (
    <View>
      <View style={styles.resultHead}>
        <Text style={styles.resultTitle}>搜索结果</Text>
        <Text style={styles.resultCount}>{results.length} 个歌单</Text>
      </View>
      {results.length === 0 ? (
        <View style={styles.stateBox}>
          <Ionicons name="search-outline" size={26} color={Colors.textMuted} />
          <Text style={styles.stateText}>没有找到「{query.trim()}」相关的歌单</Text>
        </View>
      ) : (
        results.map(renderCollectionCard)
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.greetRow}>
          <View style={styles.greetText}>
            <Text style={styles.greeting}>
              {greeting.text} {greeting.emoji}
            </Text>
            <Text style={styles.subGreeting}>让好听的歌，成为你的英语课堂</Text>
          </View>
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="搜索歌曲、歌手或专辑..."
            placeholderTextColor={Colors.textMuted}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query ? (
            <TouchableOpacity
              style={styles.searchClear}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => setQuery('')}
            >
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        {/* 精选歌单（含搜索结果）：未登录统一引导登录，不展示任何歌单数据 */}
        {query.trim() ? (
          searchContent
        ) : (
          <>
            {/* 未订阅 Apple Music 时的非阻断引导（内部自己判断要不要显示） */}
            <AppleMusicPrompt />

        {/* 生词本卡片（原「用音乐学英语」入口位）：进入生词本开始今日学习 */}
        {renderNotebookCard()}

        {/* 最近播放：只有播过歌才出现，不占没用过的用户的版面 */}
        {recent.items.length > 0 ? (
          <View>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>最近播放</Text>
              <TouchableOpacity
                onPress={() => setShowClearRecent(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.sectionAction}>清空</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.recentScroll}
              contentContainerStyle={styles.recentRow}
            >
              {recent.items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.recentCard}
                  activeOpacity={0.85}
                  onPress={() => openRecent(item)}
                >
                  {item.coverUrl ? (
                    <Image source={{ uri: item.coverUrl }} style={styles.recentCover} />
                  ) : (
                    <LinearGradient
                      colors={coverGradient(item.title)}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.recentCover, styles.recentCoverFallback]}
                    >
                      <Text style={styles.recentCoverLetter}>{coverLetter(item.title)}</Text>
                    </LinearGradient>
                  )}
                  <Text style={styles.recentTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.recentArtist} numberOfLines={1}>
                    {item.artist}
                  </Text>
                  <View style={styles.recentBadge}>
                    <Text style={styles.recentBadgeText}>{formatDuration(item.duration)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

            {collectionsContent}
          </>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={showClearRecent}
        title="清空最近播放"
        message="清空后首页将不再显示最近播放的歌曲，不影响学习记录和歌单。"
        confirmText="清空"
        onClose={() => setShowClearRecent(false)}
        onConfirm={() => {
          void recent.clear();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { backgroundColor: Colors.card, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 },
  greetRow: { flexDirection: 'row', alignItems: 'flex-start' },
  greetText: { flex: 1 },
  greeting: { fontSize: 22, fontWeight: '700', color: Colors.text },
  subGreeting: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceSoft,
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 40,
    marginTop: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
    marginLeft: 2,
  },
  searchClear: { padding: 2 },
  resultHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  resultCount: { fontSize: 12, color: Colors.textMuted },
  body: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },

  /** ── 生词本卡片（原「用音乐学英语」入口位）── */
  notebookCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleWrap: { flex: 1, minWidth: 0, marginRight: 8 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 0.2 },
  cardSubtitle: { marginTop: 3, fontSize: 12.5, color: Colors.textSecondary },
  percentBadge: {
    marginRight: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSoft,
  },
  percentBadgeText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  notebookMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSoft,
  },
  metricItem: { flex: 1, alignItems: 'center' },
  metricValue: { fontSize: 22, fontWeight: '800', lineHeight: 26 },
  metricLabel: { marginTop: 4, fontSize: 12, color: Colors.textSecondary },
  metricDivider: { width: 1, height: 30, backgroundColor: Colors.border },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 14,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceSoft,
  },
  primaryCtaText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  unloginTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSoft,
  },
  unloginTagText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  unloginHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: Colors.surfaceSoft,
  },
  unloginHintText: { flexShrink: 1, fontSize: 12, color: Colors.textMuted },
  loginStateWrap: { alignItems: 'center', paddingTop: 8, paddingBottom: 2 },
  loginStateDesc: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  sectionCount: { fontSize: 12, color: Colors.textMuted },
  sectionAction: { fontSize: 12, color: Colors.textMuted },
  /**
   * 横滑区做成「通栏」：父级 body 有 16 的左右 padding，
   * 这里用负 margin 抵消，让卡片能贴着屏幕边缘滑出；内容再用 paddingHorizontal 对齐回来。
   */
  recentScroll: { marginHorizontal: -16 },
  recentRow: { paddingHorizontal: 16, gap: 12, paddingBottom: 2 },
  recentCard: { width: 104 },
  recentCover: { width: 104, height: 104, borderRadius: 14, backgroundColor: Colors.surfaceSoft },
  recentCoverFallback: { alignItems: 'center', justifyContent: 'center' },
  recentCoverLetter: { fontSize: 38, fontWeight: '800', color: 'rgba(255,255,255,0.95)' },
  recentTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, marginTop: 8 },
  recentArtist: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  recentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.blueLight,
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 6,
  },
  recentBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.blueDeep },
  stateBox: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingVertical: 26,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 10,
  },
  /** 未登录：精选歌单引导登录 */
  loginGateBox: { marginTop: 22, gap: 12 },
  loginGateBtn: {
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.blue,
  },
  loginGateBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  stateText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  retryBtn: {
    marginTop: 2,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: Colors.blueLight,
  },
  retryText: { fontSize: 13, fontWeight: '600', color: Colors.blueDeep },
  collectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  cover: { width: 84, height: 84, borderRadius: 12 },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  collectionInfo: { flex: 1, marginLeft: 12 },
  collectionName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  collectionDesc: { fontSize: 12, color: Colors.textSub, marginTop: 5, lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  countTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.blueLight,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  countText: { fontSize: 11, color: Colors.blueDeep, fontWeight: '600' },
});
