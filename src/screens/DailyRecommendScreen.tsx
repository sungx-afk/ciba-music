import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { MusicSong, formatDuration } from '../services/musicApi';
import { recommendSongs, Song } from '../data/mock';
import { showToast } from '../utils/toast';

/**
 * 每日推荐歌曲页（UI 先行版）。
 *
 * 目前用 data/mock.ts 的 recommendSongs 做演示数据，列表项点开进播放页。
 * 接真实接口时：把 mockDaily 换成 /music/daily.json（或类似端点）返回的数据，
 * 字段对齐 MusicSong 即可，下面的渲染逻辑不用动。
 */

/** "m:ss" → 秒，给播放页的 duration 用 */
const toSeconds = (mss: string): number => {
  const [m, s] = mss.split(':').map((x) => Number(x) || 0);
  return m * 60 + s;
};

/** 演示用的 Song → 可播放 MusicSong（真实接口应直接返回 MusicSong） */
const toMusicSong = (s: Song, index: number): MusicSong => ({
  id: 1000 + index,
  title: s.title,
  artist: s.artist,
  album: '',
  duration: toSeconds(s.duration),
  url: '',
  coverUrl: '',
  description: `${s.tag} · ${s.level}`,
  sortOrder: index,
});

interface Props {
  params?: Record<string, any>;
  onOpen?: (name: string, params?: Record<string, any>) => void;
  onBack: () => void;
}

export const DailyRecommendScreen: React.FC<Props> = ({ onOpen, onBack }) => {
  const insets = useSafeAreaInsets();

  const songs = recommendSongs;
  const dailySongs = useMemo(() => songs.map(toMusicSong), [songs]);
  const todayPick = songs[0];
  const [playingId, setPlayingId] = useState<number | null>(null);

  /** 今日日期：9月28日 周日（演示用，真实场景可换成服务端返回的日期） */
  const dateLabel = useMemo(() => {
    const d = new Date();
    const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    return `${d.getMonth() + 1}月${d.getDate()}日 ${week}`;
  }, []);

  const openPlayer = (index: number) => {
    onOpen?.('Player', { song: dailySongs[index], playlist: dailySongs, index });
  };

  const playToday = () => openPlayer(0);

  const renderItem = ({ item, index }: { item: Song; index: number }) => {
    const playing = playingId === dailySongs[index].id;
    return (
      <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => openPlayer(index)}>
        <View style={styles.indexBox}>
          {playing ? (
            <Ionicons name="volume-high" size={14} color={Colors.blueDeep} />
          ) : (
            <Text style={styles.indexText}>{index + 1}</Text>
          )}
        </View>
        <LinearGradient colors={item.cover} style={[styles.rowCover, styles.coverCenter]}>
          <Ionicons name="musical-note" size={14} color="rgba(255,255,255,0.92)" />
        </LinearGradient>
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {item.artist}
          </Text>
          <View style={styles.tagRow}>
            <View style={styles.levelTag}>
              <Text style={styles.levelText}>{item.level}</Text>
            </View>
            <Text style={styles.rowTag}>{item.tag}</Text>
          </View>
        </View>
        <Text style={styles.duration}>{item.duration}</Text>
        <TouchableOpacity
          style={[styles.playBtn, playing && styles.playBtnActive]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => {
            setPlayingId(dailySongs[index].id);
            showToast('演示曲目暂无音频，接入接口后即可播放', 'info');
          }}
        >
          <Ionicons name={playing ? 'pause' : 'play'} size={14} color={playing ? '#fff' : Colors.blueDeep} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      {/* 固定头部 */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>每日推荐</Text>
        <View style={styles.topBarRight} />
      </View>

      <FlatList
        data={songs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listBody}
        ListHeaderComponent={
          <>
            {/* 今日推荐大卡 */}
            <View style={styles.heroWrap}>
              <LinearGradient colors={todayPick.cover} style={styles.heroCover}>
                <Text style={styles.heroCoverTop}>{todayPick.artist.toUpperCase()}</Text>
                <Text style={styles.heroCoverBottom}>{todayPick.title.toUpperCase()}</Text>
              </LinearGradient>
              <View style={styles.heroInfo}>
                <View style={styles.heroLabelBox}>
                  <Ionicons name="sparkles" size={12} color={Colors.goldDeep} />
                  <Text style={styles.heroLabel}>今日推荐</Text>
                  <Text style={styles.heroDate}>{dateLabel}</Text>
                </View>
                <Text style={styles.heroTitle} numberOfLines={1}>
                  {todayPick.title}
                </Text>
                <Text style={styles.heroArtist} numberOfLines={1}>
                  {todayPick.artist} · {todayPick.tag} · {todayPick.level}
                </Text>
                <View style={styles.heroActions}>
                  <TouchableOpacity style={styles.heroPlay} activeOpacity={0.85} onPress={playToday}>
                    <Ionicons name="play" size={14} color="#fff" />
                    <Text style={styles.heroPlayText}>播放</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.heroStudy}
                    activeOpacity={0.85}
                    onPress={() => showToast('学习入口后续接入', 'info')}
                  >
                    <Ionicons name="school-outline" size={14} color={Colors.blueDeep} />
                    <Text style={styles.heroStudyText}>学习</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* 列表标题 */}
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>今日歌单</Text>
              <Text style={styles.sectionCount}>共 {songs.length} 首</Text>
            </View>
          </>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.footerText}>每日为你精选，坚持听歌学英语 🎵</Text>
          </View>
        }
      />
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

  listBody: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 14 },

  // 今日推荐大卡
  heroWrap: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  heroCover: {
    width: 96,
    height: 96,
    borderRadius: 12,
    padding: 10,
    justifyContent: 'space-between',
  },
  heroCoverTop: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800' },
  heroCoverBottom: { color: '#fff', fontSize: 15, fontWeight: '900' },
  heroInfo: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  heroLabelBox: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroLabel: { fontSize: 12, fontWeight: '700', color: Colors.goldDeep },
  heroDate: { fontSize: 11, color: Colors.textMuted, marginLeft: 4 },
  heroTitle: { fontSize: 17, fontWeight: '800', color: Colors.text, marginTop: 6 },
  heroArtist: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  heroPlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.blue,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  heroPlayText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  heroStudy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.blueLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  heroStudyText: { fontSize: 13, fontWeight: '700', color: Colors.blueDeep },

  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  sectionCount: { fontSize: 12, color: Colors.textMuted },

  // 列表行
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
  coverCenter: { alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1, marginLeft: 10 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  rowMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  levelTag: {
    backgroundColor: Colors.violetLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  levelText: { fontSize: 10, color: Colors.violetDeep, fontWeight: '700' },
  rowTag: { fontSize: 11, color: Colors.textMuted },
  duration: { fontSize: 12, color: Colors.textMuted, marginRight: 10, marginLeft: 8 },
  playBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnActive: { backgroundColor: Colors.blue },

  footer: { paddingVertical: 18, alignItems: 'center' },
  footerText: { fontSize: 12, color: Colors.textMuted },
});
