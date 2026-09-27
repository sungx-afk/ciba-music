import React, { useMemo, useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { formatDuration } from '../services/musicApi';
import { showToast } from '../utils/toast';

/**
 * 搜索并添加歌曲（当前只有 UI）。
 *
 * 结构上刻意把「搜索栏 + 热门搜索」固定在上方，结果列表自己滚动，
 * 后续接入搜索接口时只需把 MOCK_RESULTS 换成接口数据即可：
 *   - 输入框 onChangeText → 防抖调搜索接口
 *   - 结果列表复用下面的 renderRow
 */

/** 占位热搜词，接口接入后可换成后端下发 */
const HOT_KEYWORDS = ['Let It Be', 'Yesterday', '经典老歌', '情态动词', '励志', '民谣'];

interface SearchResult {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: number;
  coverUrl?: string;
  /** 语法 / 词汇重点 */
  point?: string;
}

/** 占位数据：接口接入前先把列表样式跑通 */
const MOCK_RESULTS: SearchResult[] = [
  { id: 1, title: 'Let It Be', artist: 'The Beatles', album: 'Let It Be', duration: 243, point: '基础动词、祈使句' },
  { id: 2, title: 'Yesterday Once More', artist: 'Carpenters', album: 'Gold: Greatest Hits', duration: 239, point: '过去时态、怀旧词汇' },
  { id: 3, title: 'Count On Me', artist: 'Bruno Mars', album: 'Doo-Wops & Hooligans', duration: 197, point: '友谊、承诺类高频词' },
  { id: 4, title: 'You Raise Me Up', artist: 'Westlife', album: 'Westlife', duration: 239, point: '励志、鼓励类正式词汇' },
  { id: 5, title: 'Big Big World', artist: 'Emilia', album: 'Big Big World', duration: 205, point: '基础情感形容词' },
  { id: 6, title: 'Perfect', artist: 'Ed Sheeran', album: '÷ (Deluxe)', duration: 263, point: '浪漫表达、过去时 + 现在完成时' },
  { id: 7, title: 'Hey Jude', artist: 'The Beatles', album: 'Hey Jude', duration: 431, point: '祈使句、口语缩略' },
  { id: 8, title: 'Take Me Home, Country Roads', artist: 'John Denver', album: 'Poems, Prayers & Promises', duration: 190, point: '介词搭配、方向表达' },
];

interface Props {
  params?: Record<string, any>;
  onBack: () => void;
}

export const SearchSongScreen: React.FC<Props> = ({ params, onBack }) => {
  /** 顶部避开状态栏、底部避开 Home Indicator */
  const insets = useSafeAreaInsets();
  const collectionName = String(params?.collectionName || '歌单');
  const [keyword, setKeyword] = useState('');
  const trimmed = keyword.trim();

  /** 占位搜索：按标题 / 歌手本地过滤，接口接入后整段替换 */
  const results = useMemo(() => {
    if (!trimmed) return [];
    const lower = trimmed.toLowerCase();
    return MOCK_RESULTS.filter(
      (r) => r.title.toLowerCase().includes(lower) || r.artist.toLowerCase().includes(lower),
    );
  }, [trimmed]);

  const handleAdd = (song: SearchResult) => {
    // TODO: 接入「添加歌曲到歌单」接口
    showToast(`「${song.title}」添加接口待接入`, 'info');
  };

  const renderRow: ListRenderItem<SearchResult> = ({ item }) => (
    <View style={styles.row}>
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
        {item.point ? (
          <View style={styles.pointTag}>
            <Text style={styles.pointText} numberOfLines={1}>
              {item.point}
            </Text>
          </View>
        ) : null}
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
          keyExtractor={(item) => String(item.id)}
          renderItem={renderRow}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listBody}
          style={styles.list}
          ListHeaderComponent={
            <Text style={styles.resultHint}>
              搜索结果接口待接入，当前为占位数据 · 共 {results.length} 条
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="search-outline" size={26} color={Colors.textMuted} />
              <Text style={styles.emptyText}>没有找到「{trimmed}」相关的歌曲</Text>
            </View>
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
