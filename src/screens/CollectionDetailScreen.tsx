import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { getLocalSongs, subscribeLocalSongs, mapAppleSongToMusicSong } from '../services/localPlaylist';
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
  const coverUrl = String(params?.coverUrl || '');

  const [songs, setSongs] = useState<MusicSong[]>([]);
  /** 本地从 Apple Music 加入的歌曲（临时存储，后续接后端接口替换） */
  const [localSongs, setLocalSongs] = useState<MusicSong[]>([]);
  const [total, setTotal] = useState(Number(params?.songCount) || 0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
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
        // TODO: 学习状态由后端下发后，这里补 status 参数（学习中 / 已学习分页独立）
        const res = await MusicApi.getCollectionSongs(collectionId, start, PAGE_SIZE);
        setTotal(res.total || Number(params?.songCount) || 0);
        setSongs((prev) => (start === 0 ? res.list : [...prev, ...res.list]));
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
    [collectionId, params?.songCount],
  );

  useEffect(() => {
    void load(0);
    // 离开页面释放播放器
    return () => {
      void stopPreview();
    };
  }, [load]);

  /** 本地从 Apple Music 加入的歌曲：挂载读取 + 订阅搜索页的添加事件刷新 */
  useEffect(() => {
    let alive = true;
    const reloadLocal = async () => {
      const list = await getLocalSongs(collectionId);
      if (alive) setLocalSongs(list.map(mapAppleSongToMusicSong));
    };
    void reloadLocal();
    const unsub = subscribeLocalSongs(collectionId, reloadLocal);
    return () => {
      alive = false;
      unsub();
    };
  }, [collectionId]);

  /**
   * 展示列表 = 本地加入的歌曲（头部）+ 后端歌单歌曲。
   * 分页游标、hasMore 仍只用后端 songs，本地歌曲不参与翻页。
   */
  const displaySongs = useMemo(() => [...localSongs, ...songs], [localSongs, songs]);

  /**
   * 分区过滤。
   * 后端目前还没有下发学习状态字段，此时两个 tab 都展示全部歌曲（不至于看起来像坏了）；
   * 一旦响应里带上 studyStatus（2 = 已学习），就自动按 tab 分流。
   */
  const hasStudyStatus = displaySongs.some((s) => s.studyStatus !== undefined && s.studyStatus !== null);
  const visibleSongs = hasStudyStatus
    ? displaySongs.filter((s) => (tab === 'learned' ? s.studyStatus === 2 : s.studyStatus !== 2))
    : displaySongs;

  const hasMore = songs.length > 0 && songs.length < total;

  const onEndReached = () => {
    if (loading || loadingMore || !hasMore) return;
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
      playlist: visibleSongs,
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
    const first = visibleSongs.find((s) => !!s.url);
    if (first) void togglePlay(first);
  };

  const openSearch = () => {
    onOpen?.('SearchSong', { collectionId, collectionName });
  };

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator color={Colors.blue} />
        </View>
      );
    }
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
        data={visibleSongs}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderSong}
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

      <View style={styles.hero}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.heroCover} />
        ) : (
          <LinearGradient colors={['#8FB2FF', '#3D5AFE']} style={[styles.heroCover, styles.coverCenter]}>
            <Ionicons name="musical-notes" size={24} color="rgba(255,255,255,0.9)" />
          </LinearGradient>
        )}
        <View style={styles.heroInfo}>
          <Text style={styles.heroName} numberOfLines={2}>
            {collectionName}
          </Text>
          <Text style={styles.heroCount}>{total + localSongs.length ? `${total + localSongs.length} 首歌曲` : '歌曲列表'}</Text>
        </View>
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
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.8} onPress={openSearch}>
            <Ionicons name="add" size={18} color={Colors.blueDeep} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.playAllBtn} activeOpacity={0.85} onPress={playAll}>
            <Ionicons name="play" size={12} color="#fff" />
            <Text style={styles.playAllText}>播放全部</Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderList()}
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
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  heroCover: { width: 72, height: 72, borderRadius: 12 },
  coverCenter: { alignItems: 'center', justifyContent: 'center' },
  heroInfo: { flex: 1, marginLeft: 14 },
  heroName: { fontSize: 17, fontWeight: '700', color: Colors.text },
  heroCount: { fontSize: 12, color: Colors.textMuted, marginTop: 8 },
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
