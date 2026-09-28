import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ListRenderItem,
  Image,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { formatDuration } from '../services/musicApi';
import { showToast } from '../utils/toast';
import { isPlayerAvailable, searchSongs, AppleMusicSong } from '../../modules/apple-music-player';
import { addLocalSong } from '../services/localPlaylist';

/**
 * 搜索并添加歌曲：关键词 → 在 Apple Music 目录里搜索（MusicKit）。
 *
 * 结构：搜索栏固定在顶部，结果列表自己滚动。
 *   - 输入框 onChangeText → 400ms 防抖调 searchSongs
 *   - 模拟器 / Expo Go 拿不到 MusicKit 原生模块时，提示需在真机已授权环境
 */

/** 占位热搜词，接口接入后可换成后端下发 */
const HOT_KEYWORDS = ['Let It Be', 'Yesterday', '经典老歌', '励志', '民谣', 'Ed Sheeran'];

interface Props {
  params?: Record<string, any>;
  onBack: () => void;
}

export const SearchSongScreen: React.FC<Props> = ({ params, onBack }) => {
  /** 顶部避开状态栏、底部避开 Home Indicator */
  const insets = useSafeAreaInsets();
  const collectionName = String(params?.collectionName || '歌单');
  const collectionId = Number(params?.collectionId);
  const [keyword, setKeyword] = useState('');
  const trimmed = keyword.trim();

  const [results, setResults] = useState<AppleMusicSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 只认最后一次请求的结果，避免快速输入时旧请求覆盖新结果 */
  const reqRef = useRef(0);

  // 本机是否有可用的 MusicKit 原生模块（iOS 真机 + 已打进包）
  const musicAvailable = isPlayerAvailable();

  useEffect(() => {
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    // 模拟器 / Expo Go / 安卓：Apple Music 目录不可用，直接给兜底提示
    if (!musicAvailable) {
      setResults([]);
      setLoading(false);
      setError('Apple Music 搜索需在 iOS 真机并已授权 MusicKit 的环境下使用（模拟器 / Expo Go 不可用）');
      return;
    }
    const reqId = ++reqRef.current;
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      searchSongs(trimmed)
        .then((r) => {
          if (reqId === reqRef.current) {
            setResults(r);
            setLoading(false);
          }
        })
        .catch((e: any) => {
          if (reqId === reqRef.current) {
            setError(e?.message || 'Apple Music 搜索失败');
            setLoading(false);
          }
        });
    }, 400);
    return () => clearTimeout(timer);
  }, [trimmed, musicAvailable]);

  const handleAdd = async (song: AppleMusicSong) => {
    if (!collectionId) {
      showToast('该歌单暂不支持添加', 'info');
      return;
    }
    try {
      // 临时本地加入：去重后写入 AsyncStorage，详情页会合并展示（后续接后端接口替换此逻辑）
      const added = await addLocalSong(collectionId, song);
      showToast(
        added ? `已添加到「${collectionName}」` : '这首歌已经在歌单里了',
        'info',
      );
    } catch {
      showToast('添加失败，请重试', 'info');
    }
  };

  const renderRow: ListRenderItem<AppleMusicSong> = ({ item }) => (
    <View style={styles.row}>
      {item.artworkUrl ? (
        <Image source={{ uri: item.artworkUrl }} style={styles.rowCover} />
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
      </View>
      <Text style={styles.duration}>{formatDuration(item.duration)}</Text>
      <TouchableOpacity style={styles.addRowBtn} onPress={() => handleAdd(item)} activeOpacity={0.8}>
        <Ionicons name="add" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      {/* 固定头部：返回 + 搜索框 */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.input}
            value={keyword}
            onChangeText={setKeyword}
            placeholder={`搜索歌曲、歌手，添加到${collectionName}`}
            placeholderTextColor={Colors.textMuted}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />
          {keyword ? (
            <TouchableOpacity onPress={() => setKeyword('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {trimmed ? (
        /* 结果列表：只有这一块滚动 */
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listBody}
          style={styles.list}
          ListHeaderComponent={
            error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={22} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : loading ? (
              <View style={styles.tipBox}>
                <ActivityIndicator size="small" color={Colors.blue} />
                <Text style={styles.tipText}>正在从 Apple Music 搜索「{trimmed}」…</Text>
              </View>
            ) : (
              <Text style={styles.resultHint}>Apple Music 搜索结果 · 共 {results.length} 条</Text>
            )
          }
          ListEmptyComponent={
            loading || error ? null : (
              <View style={styles.emptyBox}>
                <Ionicons name="search-outline" size={26} color={Colors.textMuted} />
                <Text style={styles.emptyText}>没有找到「{trimmed}」相关的歌曲</Text>
              </View>
            )
          }
        />
      ) : (
        /* 未输入时：固定区域展示热门搜索 */
        <View style={styles.hotWrap}>
          <Text style={styles.sectionTitle}>热门搜索</Text>
          <View style={styles.chipWrap}>
            {HOT_KEYWORDS.map((k) => (
              <TouchableOpacity key={k} style={styles.chip} activeOpacity={0.8} onPress={() => setKeyword(k)}>
                <Text style={styles.chipText}>{k}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.tipBox}>
            <Ionicons name="information-circle-outline" size={15} color={Colors.textMuted} />
            <Text style={styles.tipText}>
              输入歌曲名或歌手名，即可把歌曲添加到「{collectionName}」
            </Text>
          </View>
        </View>
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
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  backBtn: { marginRight: 4 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceSoft,
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 40,
  },
  input: { flex: 1, fontSize: 14, color: Colors.text, paddingVertical: 0 },
  list: { flex: 1 },
  listBody: { paddingHorizontal: 16, paddingBottom: 24 },
  resultHint: { fontSize: 11, color: Colors.textMuted, paddingVertical: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  rowCover: { width: 44, height: 44, borderRadius: 8 },
  coverCenter: { alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1, marginLeft: 10 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  rowMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  duration: { fontSize: 12, color: Colors.textMuted, marginRight: 10 },
  addRowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 13, color: Colors.textMuted },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  errorText: { flex: 1, fontSize: 12, color: Colors.danger, lineHeight: 17 },
  hotWrap: { paddingHorizontal: 16, paddingTop: 18 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  chip: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: { fontSize: 13, color: Colors.textSub },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 22,
  },
  tipText: { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
});
