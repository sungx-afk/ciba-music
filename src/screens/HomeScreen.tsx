import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
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
import { homeBanner } from '../data/mock';
import { MusicApi, MusicCollection, formatDuration } from '../services/musicApi';
import { RecentPlayItem, toMusicSong } from '../services/recentPlays';
import { useRecentPlays } from '../hooks/useRecentPlays';
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

export const HomeScreen: React.FC<{ onOpen: OpenFn }> = ({ onOpen }) => {
  /** 真机状态栏会压住问候语，顶部留出安全区（底部由 TabBar 负责） */
  const insets = useSafeAreaInsets();
  const [collections, setCollections] = useState<MusicCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  /** 最近播放：自己订阅变更，播放页写入后这里自动刷新 */
  const recent = useRecentPlays();
  const [showClearRecent, setShowClearRecent] = useState(false);

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

  useEffect(() => {
    void load();
  }, [load]);

  const openCollection = (item: MusicCollection) => {
    onOpen('Collection', {
      collectionId: item.id,
      collectionName: item.name,
      coverUrl: item.coverUrl,
      songCount: item.songCount,
    });
  };

  /** 从最近播放直接回到播放页：记录里已带 url / appleId，可以直接起播 */
  const openRecent = (item: RecentPlayItem) => {
    const song = toMusicSong(item);
    onOpen('Player', { song, playlist: [song] });
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.greetRow}>
          <View style={styles.greetText}>
            <Text style={styles.greeting}>Good morning 👋</Text>
            <Text style={styles.subGreeting}>让好听的歌，成为你的英语课堂</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={18} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.searchBox} activeOpacity={0.8}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <Text style={styles.searchText}>搜索歌曲、歌手或专辑...</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        {/* 未订阅 Apple Music 时的非阻断引导（内部自己判断要不要显示） */}
        <AppleMusicPrompt />

        {/* 点「用音乐学英语」banner → 进入每日推荐歌曲页 */}
        <TouchableOpacity
          activeOpacity={0.96}
          onPress={() => onOpen('DailyRecommend')}
          style={styles.bannerTouch}
        >
          <LinearGradient
            colors={homeBanner.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          >
            <View style={styles.bannerGlow} />
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>{homeBanner.title}</Text>
              <Text style={styles.bannerDesc}>{homeBanner.desc}</Text>
            </View>
            <TouchableOpacity
              style={styles.bannerPlay}
              activeOpacity={0.9}
              onPress={() => onOpen('DailyRecommend')}
            >
              <Ionicons name="play" size={16} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>
        </TouchableOpacity>

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

        {!loading && !error
          ? collections.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.collectionCard}
                activeOpacity={0.85}
                onPress={() => openCollection(item)}
              >
                {item.coverUrl ? (
                  <Image source={{ uri: item.coverUrl }} style={styles.cover} />
                ) : (
                  <LinearGradient
                    colors={['#8FB2FF', '#3D5AFE']}
                    style={[styles.cover, styles.coverFallback]}
                  >
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
            ))
          : null}
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
  bellBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  searchText: { color: Colors.textMuted, fontSize: 13 },
  body: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  banner: {
    height: 116,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    /**
     * 顶部间距由 banner 自己负责（它是常驻的，订阅提示条不一定显示）：
     * 提示条显示时 → 搜索框 12 + 提示条 + 12 + banner；隐藏时 → 搜索框 12 + banner。
     * 提示条自己只有 marginTop，别再让它管底部间距，否则真机上会和 banner 贴在一起。
     */
    marginTop: 12,
  },
  /** 外层可点击容器：裁剪圆角，让渐变背景被一起圆角裁掉 */
  bannerTouch: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  bannerGlow: {
    position: 'absolute',
    right: -30,
    bottom: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  bannerDesc: { fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 8 },
  bannerPlay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
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
