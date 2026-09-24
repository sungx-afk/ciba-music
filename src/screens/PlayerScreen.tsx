import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { nowPlaying, playingLyrics, vocabList } from '../data/mock';

const TABS = ['歌词', '翻译', '学习', '词汇'];

export const PlayerScreen: React.FC<{ onOpen: (name: string) => void; onBack: () => void }> = ({
  onOpen,
  onBack,
}) => {
  const [playing, setPlaying] = useState(true);
  const [tab, setTab] = useState('歌词');
  return (
    <View style={styles.root}>
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
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.topRight}>
            <TouchableOpacity>
              <Ionicons name="heart-outline" size={21} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headRow}>
          <LinearGradient colors={nowPlaying.cover} style={styles.cover}>
            <Text style={styles.coverTop}>{nowPlaying.coverTop}</Text>
            <View style={styles.sunWrap}>
              <LinearGradient colors={['#FFF3C4', '#F0A81E', '#D9770F']} style={styles.sun} />
            </View>
            <Text style={styles.coverBottom}>{nowPlaying.coverBottom}</Text>
          </LinearGradient>
          <View style={styles.headInfo}>
            <Text style={styles.songTitle}>{nowPlaying.title}</Text>
            <Text style={styles.songArtist}>{nowPlaying.artist}</Text>
            <Text style={styles.songAlbum}>{nowPlaying.album}</Text>
            <View style={styles.tagRow}>
              <View style={styles.levelTag}>
                <Text style={styles.levelText}>{nowPlaying.level}</Text>
              </View>
              <View style={styles.genreTag}>
                <Text style={styles.genreText}>{nowPlaying.tag}</Text>
              </View>
            </View>
            <Text style={styles.desc}>{nowPlaying.desc}</Text>
          </View>
        </View>
        <View style={styles.progressWrap}>
          <View style={styles.track}>
            <View style={styles.fill} />
            <View style={styles.knob} />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.time}>{nowPlaying.elapsed}</Text>
            <Text style={styles.time}>{nowPlaying.duration}</Text>
          </View>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity>
            <Ionicons name="shuffle" size={19} color={S.textSub} />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="play-skip-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.playBtn} onPress={() => setPlaying(!playing)}>
            <Ionicons name={playing ? 'pause' : 'play'} size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="play-skip-forward" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="repeat" size={19} color={S.textSub} />
          </TouchableOpacity>
        </View>
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
        <View style={styles.panel}>
          {tab === '歌词' &&
            playingLyrics.map((l, i) => (
              <View key={l.id} style={[styles.lyricItem, i === 0 && styles.lyricItemOn]}>
                <View style={styles.lyricHead}>
                  {i === 0 ? <Ionicons name="stats-chart" size={13} color={S.gold} /> : null}
                  <Text style={[styles.lyricEn, i === 0 && styles.lyricEnOn]}>{l.en}</Text>
                  {i === 0 ? <Text style={styles.lyricTime}>{l.time}</Text> : null}
                </View>
                <Text style={[styles.lyricZh, i === 0 && styles.lyricZhOn]}>{l.zh}</Text>
              </View>
            ))}
          {tab === '翻译' && playingLyrics.map((l) => <Text key={l.id} style={styles.zhOnly}>{l.zh}</Text>)}
          {tab === '学习' && (
            <TouchableOpacity style={styles.learnCta} onPress={() => onOpen('Lyrics')}>
              <Ionicons name="sparkles" size={16} color="#fff" />
              <Text style={styles.learnCtaText}>开始逐句学习这首歌</Text>
            </TouchableOpacity>
          )}
          {tab === '词汇' &&
            vocabList.map((v) => (
              <View key={v.id} style={styles.vocabRow}>
                <Text style={styles.vocabWord}>{v.word}</Text>
                <Text style={styles.vocabPhonetic}>{v.phoneticUk}</Text>
                <Text style={styles.vocabMeaning}>{v.meaning}</Text>
              </View>
            ))}
        </View>
      </ScrollView>
      <View style={styles.bottomBar}>
        <LinearGradient colors={nowPlaying.cover} style={styles.miniCover}>
          <View style={styles.miniSun} />
        </LinearGradient>
        <View style={styles.miniInfo}>
          <Text style={styles.miniTitle}>{nowPlaying.title}</Text>
          <Text style={styles.miniArtist}>{nowPlaying.artist}</Text>
        </View>
        <TouchableOpacity style={styles.miniBtn} onPress={() => setPlaying(!playing)}>
          <Ionicons name={playing ? 'pause' : 'play'} size={17} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.miniBtn}>
          <Ionicons name="play-skip-forward" size={17} color="#fff" />
        </TouchableOpacity>
      </View>
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
  glow: {
    position: 'absolute',
    top: 0,
    left: -28,
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  body: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 18 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  headRow: { flexDirection: 'row', marginTop: 14 },
  cover: {
    width: 148,
    height: 148,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coverTop: { fontSize: 9, letterSpacing: 3, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  sunWrap: {
    width: 105,
    height: 105,
    borderRadius: 53,
    backgroundColor: 'rgba(245,166,35,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sun: { width: 84, height: 84, borderRadius: 42 },
  coverBottom: { fontSize: 9, letterSpacing: 3, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  headInfo: { flex: 1, marginLeft: 14 },
  songTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  songArtist: { fontSize: 13, color: S.textSub, marginTop: 3 },
  songAlbum: { fontSize: 11, color: S.muted, marginTop: 4 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
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
  progressWrap: { marginTop: 22 },
  track: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)' },
  fill: { width: '32%', height: 3, borderRadius: 2, backgroundColor: '#A7B2F0' },
  knob: {
    position: 'absolute',
    left: '30%',
    top: -4,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  time: { fontSize: 11, color: S.muted },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
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
  segment: {
    flexDirection: 'row',
    marginTop: 22,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 4,
  },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
  segItemOn: { backgroundColor: 'rgba(255,255,255,0.13)' },
  segText: { fontSize: 13, color: S.muted },
  segTextOn: { color: '#fff', fontWeight: '700' },
  panel: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  lyricItem: { marginBottom: 14 },
  lyricItemOn: {},
  lyricHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  lyricEn: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.86)' },
  lyricEnOn: { fontSize: 15.5, fontWeight: '700', color: '#fff' },
  lyricTime: { marginLeft: 'auto', fontSize: 10, color: S.gold },
  lyricZh: { fontSize: 12, color: S.muted, marginTop: 4 },
  lyricZhOn: { color: 'rgba(255,255,255,0.66)', marginLeft: 20 },
  zhOnly: { fontSize: 13, lineHeight: 20, color: 'rgba(255,255,255,0.8)', marginBottom: 12 },
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
  vocabRow: { marginBottom: 14 },
  vocabWord: { fontSize: 14, fontWeight: '700', color: '#fff' },
  vocabPhonetic: { fontSize: 11, color: S.muted, marginTop: 2 },
  vocabMeaning: { fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 3 },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 10,
  },
  miniCover: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  miniSun: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#F0A81E' },
  miniInfo: { flex: 1, marginLeft: 10 },
  miniTitle: { fontSize: 13, fontWeight: '700', color: '#fff' },
  miniArtist: { fontSize: 11, color: S.textSub, marginTop: 2 },
  miniBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
});
