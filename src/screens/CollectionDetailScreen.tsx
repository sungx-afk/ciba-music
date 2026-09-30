import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { MusicApi, MusicSong, formatDuration } from '../services/musicApi';
import { takeAddedSongs } from '../services/addedSongsCache';
import { clearVipGateCache, isVipUser, FREE_SONG_LIMIT } from '../services/vipGate';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog, DialogPayload } from '../components/ConfirmDialog';
import { playPreview, stopPreview } from '../utils/audioPreview';
import { showToast } from '../utils/toast';

/** 每页条数，与 /musics.json 的 limit 保持一致 */
const PAGE_SIZE = 20;

/** 列表分区：学习中 / 已学习 */
type StudyTab = 'learning' | 'learned';

const TABS: { key: StudyTab; label: string }[] = [
  { key: 'learning', label: '学习中' },
  { key: 'learned', label: '已学习' },
];

interface Props {
  params?: Record<string, any>;
  onOpen?: (name: string, params?: Record<string, any>) => void;
  onBack: () => void;
}

export const CollectionDetailScreen: React.FC<Props> = ({ params, onOpen, onBack }) => {
  /** 顶部避开状态栏、底部避开 Home Indicator */
  const insets = useSafeAreaInsets();
  const collectionId = Number(params?.collectionId);
  const collectionName = String(params?.collectionName || '歌单');
  /** 仅个人歌单（type=1）支持搜索添加歌曲；精选 / 官方歌单（type=0 或缺省）不显示 + 号 */
  const canAddSongs = Number(params?.type) === 1;
  /** 当前账号是否会员：非会员只能看到前 FREE_SONG_LIMIT 首 */
  const { user } = useAuth();
  const [isVip, setIsVip] = useState(() => Number((user as any)?.vip) === 1);
  /** 会员限制类的统一弹窗（如非会员点「添加」） */
  const [dialog, setDialog] = useState<DialogPayload | null>(null);

  const [songs, setSongs] = useState<MusicSong[]>([]);
  const [total, setTotal] = useState(Number(params?.songCount) || 0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  /** 下拉刷新状态：不触发整页 loading，列表保持可见、顶部转圈 */
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [tab, setTab] = useState<StudyTab>('learning');
  /** 上锁：防止 onEndReached 连续触发重复拉同一页 */
  const locked = useRef(false);

  const load = useCallback(
    async (start: number) => {
      if (locked.current) return;
      locked.current = true;
      if (start === 0) {
        setLoading(true);
        setError('');
      } else {
        setLoadingMore(true);
      }
      try {
        // 学习中 tab=0，已学 tab=1；后端按当前用户 tbl_music_learned 过滤
        const learned = tab === 'learned' ? 1 : 0;
        const res = await MusicApi.getCollectionSongs(collectionId, start, PAGE_SIZE, learned);
        setTotal(res.total || Number(params?.songCount) || 0);
        if (start === 0) {
          const pending = takeAddedSongs(collectionId);
          // 补救：后端异步生成歌词期间，刚加的歌可能还没出现在列表里，
          // 把乐观缓存的（带真实 id）先插到头部；列表已返回同 id 则去重，不会重复
          const pendingNew = pending.filter((s) => !res.list.some((x) => x.id === s.id));
          setSongs([...pendingNew, ...res.list]);
        } else {
          setSongs((prev) => [...prev, ...res.list]);
        }
      } catch (e: any) {
        const msg = e?.message || '歌曲加载失败';
        if (start === 0) {
          setError(msg);
        } else {
          showToast(msg, 'info');
        }
      } finally {
        locked.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [collectionId, params?.songCount, tab],
  );

  /** 下拉刷新：重新拉第一页，不显示整页 loading，列表保持可见 */
  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const learned = tab === 'learned' ? 1 : 0;
      const res = await MusicApi.getCollectionSongs(collectionId, 0, PAGE_SIZE, learned);
      setTotal(res.total || Number(params?.songCount) || 0);
      const pending = takeAddedSongs(collectionId);
      const pendingNew = pending.filter((s) => !res.list.some((x) => x.id === s.id));
      setSongs([...pendingNew, ...res.list]);
    } catch (e: any) {
      showToast(e?.message || '刷新失败', 'info');
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, collectionId, params?.songCount]);

  useEffect(() => {
    void load(0);
    // 离开页面释放播放器
    return () => {
      void stopPreview();
    };
  }, [load]);

  /**
   * 展示列表 = 后端按当前 tab 的 learned 过滤后返回的歌曲（学习中=0 / 已学=1）。
   * 学习状态由服务端 tbl_music_learned 判定，切 tab 会重新拉取。
   */
  const visibleSongs = songs;

  /**
   * 会员状态：进页面时校准一次（非会员默认按受限展示，避免先闪出全部歌曲）。
   * 先清缓存 —— 从会员页买完返回时本页会重新挂载，不能吃到 60s 内的旧结果。
   */
  useEffect(() => {
    let alive = true;
    clearVipGateCache();
    void isVipUser((user as any)?.vip).then((vip) => {
      if (alive) setIsVip(vip);
    });
    return () => {
      alive = false;
    };
  }, [user]);

  /** 实际展示的歌曲：非会员只给前 FREE_SONG_LIMIT 首，其余锁起来 */
  const listSongs = isVip ? visibleSongs : visibleSongs.slice(0, FREE_SONG_LIMIT);
  /** 被会员限制藏起来的数量（> 0 时列表底部出升级提示） */
  const lockedCount = Math.max(0, visibleSongs.length - listSongs.length);
  /** 歌单歌曲总数，用于升级提示里的「解锁全部 N 首」 */
  const totalCount = Math.max(total, visibleSongs.length);

  const hasMore = songs.length > 0 && songs.length < total;

  const onEndReached = () => {
    if (loading || loadingMore || !hasMore) return;
    // 非会员看不到第 5 首之后的，继续翻页没有意义
    if (lockedCount > 0) return;
    void load(songs.length);
  };

  const togglePlay = async (song: MusicSong) => {
    if (!song.url) {
      showToast('这首歌暂无试听音频', 'info');
      return;
    }
    if (playingId === song.id) {
      await stopPreview();
      setPlayingId(null);
      return;
    }
    setPlayingId(song.id);
    const ok = await playPreview(song.url, () => setPlayingId(null));
    if (!ok) {
      setPlayingId(null);
      showToast('试听失败，请检查网络', 'info');
    }
  };

  /** 点整行进播放页：带上整张歌单，播完自动接下一首 */
  const openPlayer = async (song: MusicSong, index: number) => {
    // 列表试听和播放页不能同时出声，进播放页前先停掉试听
    await stopPreview();
    setPlayingId(null);
    onOpen?.('Player', {
      song,
      // 播放列表与列表展示保持一致：非会员点「下一首」也不会越到锁住的歌
      playlist: listSongs,
      index,
      collectionName,
    });
  };

  const renderSong: ListRenderItem<MusicSong> = ({ item, index }) => {
    const playing = playingId === item.id;
    return (
      <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => openPlayer(item, index)}>
        <View style={styles.indexBox}>
          {playing ? (
            <Ionicons name="volume-high" size={14} color={Colors.blueDeep} />
          ) : (
            <Text style={styles.indexText}>{index + 1}</Text>
          )}
        </View>
        {item.coverUrl ? (
          <Image source={{ uri: item.coverUrl }} style={styles.rowCover} />
        ) : (
          <LinearGradient colors={['#8FB2FF', '#3D5AFE']} style={[styles.rowCover, styles.coverCenter]}>
            <Ionicons name="musical-note" size={14} color="rgba(255,255,255,0.9)" />
          </LinearGradient>
        )}
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {[item.artist, item.album].filter(Boolean).join(' · ')}
          </Text>
          {item.description ? (
            <View style={styles.pointTag}>
              <Text style={styles.pointText} numberOfLines={1}>
                {item.description}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.duration}>{formatDuration(item.duration)}</Text>
        <TouchableOpacity
          style={[styles.playBtn, playing && styles.playBtnActive]}
          onPress={() => togglePlay(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={playing ? 'pause' : 'play'}
            size={14}
            color={playing ? '#fff' : Colors.blueDeep}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const playAll = () => {
    const first = listSongs.find((s) => !!s.url);
    if (first) void togglePlay(first);
  };

  const openSearch = () => {
    // 仅个人歌单（type=1）支持搜索添加，精选 / 官方歌单不开放
    if (!canAddSongs) return;
    // 非会员不能往歌单里加歌：弹开通提示
    if (!isVip) {
      setDialog({
        title: '需要升级 VIP 会员',
        message: '开通会员后才能往歌单里添加歌曲',
        confirmText: '去开通',
        onConfirm: () => onOpen?.('Purchase'),
        onCancel: () => setDialog(null),
      });
      return;
    }
    onOpen?.('SearchSong', { collectionId, collectionName });
  };

  /** 非会员的升级提示：列表底部常驻 */
  const renderLockFooter = () => (
    <View style={styles.lockCard}>
      <View style={styles.lockIconWrap}>
        <Ionicons name="lock-closed" size={15} color={Colors.goldDeep} />
      </View>
      <View style={styles.lockInfo}>
        <Text style={styles.lockTitle}>免费用户仅显示前 {FREE_SONG_LIMIT} 首</Text>
        <Text style={styles.lockDesc}>升级 VIP 会员，可显示全部 {totalCount} 首歌曲</Text>
      </View>
      <TouchableOpacity
        style={styles.lockBtn}
        activeOpacity={0.85}
        onPress={() => onOpen?.('Purchase')}
      >
        <Text style={styles.lockBtnText}>去开通</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator color={Colors.blue} />
        </View>
      );
    }
    // 有被锁住的歌时，只说清「为什么只剩这几首」，不再显示「已经到底啦」
    if (lockedCount > 0) return renderLockFooter();
    if (!loading && visibleSongs.length > 0 && !hasMore) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>已经到底啦 · 共 {visibleSongs.length} 首</Text>
        </View>
      );
    }
    return null;
  };

  /** 列表区域：只有这一块滚动，上面的头部与工具条固定 */
  const renderList = () => {
    if (!collectionId) {
      return <Text style={styles.stateText}>歌单不存在</Text>;
    }
    if (loading) {
      return (
        <View style={styles.stateBox}>
          <ActivityIndicator color={Colors.blue} />
          <Text style={styles.stateText}>正在加载歌曲…</Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.stateBox}>
          <Ionicons name="cloud-offline-outline" size={26} color={Colors.textMuted} />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load(0)}>
            <Text style={styles.retryText}>重新加载</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <FlatList
        data={listSongs}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderSong}
        refreshing={refreshing}
        onRefresh={refresh}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="musical-notes-outline" size={26} color={Colors.textMuted} />
            <Text style={styles.stateText}>
              {tab === 'learned' ? '还没有已学习的歌曲' : '这个歌单还没有歌曲'}
            </Text>
          </View>
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listBody}
        style={styles.list}
      />
    );
  };

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      {/* 固定头部：返回栏 + 歌单信息 + 工具条 */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          {collectionName}
        </Text>
        <View style={styles.topBarRight} />
      </View>

      {/* 工具条：左侧分区 tab，右侧「添加」与「播放全部」 */}
      <View style={styles.toolbar}>
        <View style={styles.tabs}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, active && styles.tabActive]}
                activeOpacity={0.8}
                onPress={() => setTab(t.key)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.toolActions}>
          {canAddSongs && (
            <TouchableOpacity style={styles.addBtn} activeOpacity={0.8} onPress={openSearch}>
              <Ionicons name="add" size={18} color={Colors.blueDeep} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.playAllBtn} activeOpacity={0.85} onPress={playAll}>
            <Ionicons name="play" size={12} color="#fff" />
            <Text style={styles.playAllText}>播放全部</Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderList()}

      {dialog && (
        <ConfirmDialog visible onClose={() => setDialog(null)} {...dialog} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  topTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.text, marginLeft: 8 },
  topBarRight: { width: 24 },
  coverCenter: { alignItems: 'center', justifyContent: 'center' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSoft,
    borderRadius: 18,
    padding: 3,
  },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 15 },
  tabActive: {
    backgroundColor: Colors.card,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textSub },
  tabTextActive: { color: Colors.blueDeep },
  toolActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.blue,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  playAllText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  /** 非会员：列表底部的升级提示 */
  lockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.goldLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F7E3BC',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  lockIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(245,166,35,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockInfo: { flex: 1, marginLeft: 10 },
  lockTitle: { fontSize: 13, fontWeight: '700', color: Colors.goldDeep },
  lockDesc: { fontSize: 11.5, color: Colors.textSub, marginTop: 3 },
  lockBtn: {
    backgroundColor: Colors.goldDeep,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginLeft: 10,
  },
  lockBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  list: { flex: 1, marginTop: 12 },
  listBody: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  indexBox: { width: 22, alignItems: 'center' },
  indexText: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
  rowCover: { width: 44, height: 44, borderRadius: 8, marginLeft: 4 },
  rowInfo: { flex: 1, marginLeft: 10 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  rowMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  pointTag: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.goldLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 5,
    maxWidth: '100%',
  },
  pointText: { fontSize: 10, color: Colors.goldDeep, fontWeight: '600' },
  duration: { fontSize: 12, color: Colors.textMuted, marginRight: 10 },
  playBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnActive: { backgroundColor: Colors.blue },
  stateBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 10 },
  stateText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: Colors.blueLight,
  },
  retryText: { fontSize: 13, fontWeight: '600', color: Colors.blueDeep },
  footer: { paddingVertical: 18, alignItems: 'center' },
  footerText: { fontSize: 12, color: Colors.textMuted },
});
