import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../theme/colors';
import { nowPlaying, playingLyrics } from '../data/mock';
import { pronounceWord } from '../utils/speech';
import { showToast } from '../utils/toast';

type TabKey = 'word' | 'line' | 'compare';

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'word', label: '逐词', icon: 'text-outline' },
  { key: 'line', label: '逐行', icon: 'list-outline' },
  { key: 'compare', label: '对照', icon: 'git-compare-outline' },
];

/** 「Aa」字号档位：小 / 标准 / 大，只作用于歌词与释义正文 */
const FONT_SCALES = [0.92, 1, 1.12];

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

export const LyricsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [tab, setTab] = useState<TabKey>('word');
  const [activeIndex, setActiveIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [scaleIndex, setScaleIndex] = useState(1);
  const [cardOpen, setCardOpen] = useState(true);
  const [added, setAdded] = useState<Record<string, boolean>>({});

  const scale = FONT_SCALES[scaleIndex];
  const activeLine = playingLyrics[activeIndex];
  const words = activeLine.words ?? [];
  const activeWord = words[wordIndex];
  const isAdded = activeWord ? !!added[activeWord.word] : false;

  const speak = (text: string) => {
    pronounceWord(text, { rate: 0.92 });
  };

  const selectLine = (index: number) => {
    setActiveIndex(index);
    setWordIndex(0);
    setCardOpen(true);
  };

  const selectWord = (index: number) => {
    setWordIndex(index);
    setCardOpen(true);
  };

  const addToBook = () => {
    if (!activeWord || isAdded) return;
    setAdded((prev) => ({ ...prev, [activeWord.word]: true }));
    showToast('已加入生词本', 'success');
  };

  /** 逐词模式的句子：只有歌词里带释义的单词可点，点中后展示释义卡片 */
  const renderSentence = () => {
    const tokens = activeLine.en.split(' ');
    const studyWords = words.map((w) => w.word.toLowerCase());
    return (
      <Text style={[styles.activeEn, { fontSize: 16 * scale }]}>
        {tokens.map((token, i) => {
          const index = studyWords.indexOf(token.toLowerCase().replace(/[^a-z']/g, ''));
          const tappable = index >= 0;
          const on = tappable && index === wordIndex && cardOpen;
          return (
            <Text
              key={`${token}-${i}`}
              onPress={tappable ? () => selectWord(index) : undefined}
              style={tappable ? [styles.token, on && styles.tokenOn] : undefined}
            >
              {i < tokens.length - 1 ? `${token} ` : token}
            </Text>
          );
        })}
      </Text>
    );
  };

  const renderWordCard = () => {
    if (!cardOpen || !activeWord) return null;
    return (
      <View style={styles.wordCard}>
        <TouchableOpacity
          style={styles.wordClose}
          onPress={() => setCardOpen(false)}
          hitSlop={HIT}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={14} color={Colors.blue} />
        </TouchableOpacity>

        <View style={styles.wordTop}>
          <Text style={[styles.wordText, { fontSize: 17 * scale }]}>{activeWord.word}</Text>
          <Text style={styles.wordPhonetic}>{activeWord.phonetic}</Text>
          <TouchableOpacity
            style={styles.wordSpeak}
            onPress={() => speak(activeWord.word)}
            hitSlop={HIT}
            activeOpacity={0.7}
          >
            <Ionicons name="volume-medium" size={16} color={Colors.blue} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.wordMeaning, { fontSize: 13.5 * scale }]}>
          <Text style={styles.wordPos}>{activeWord.pos} </Text>
          {activeWord.meaning}
        </Text>

        <Text style={[styles.exampleEn, { fontSize: 13.5 * scale }]}>{activeWord.example}</Text>
        <Text style={styles.exampleZh}>{activeWord.exampleZh}</Text>

        <TouchableOpacity
          style={[styles.addBtn, isAdded && styles.addBtnOn]}
          onPress={addToBook}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isAdded ? 'checkmark-circle' : 'add-circle-outline'}
            size={15}
            color={isAdded ? Colors.textMuted : Colors.blue}
          />
          <Text style={[styles.addText, isAdded && styles.addTextOn]}>
            {isAdded ? '已加入生词本' : '加入生词本'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} hitSlop={HIT} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>歌词学习</Text>
        <TouchableOpacity
          style={styles.aaBtn}
          onPress={() => setScaleIndex((i) => (i + 1) % FONT_SCALES.length)}
          hitSlop={HIT}
          activeOpacity={0.7}
        >
          <Text style={styles.aaText}>Aa</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.songRow}>
        <LinearGradient colors={nowPlaying.cover} style={styles.cover}>
          <LinearGradient colors={['#FFF3C4', '#F0A81E', '#D9770F']} style={styles.coverSun} />
        </LinearGradient>
        <View style={styles.songInfo}>
          <Text style={styles.songTitle}>{nowPlaying.title}</Text>
          <Text style={styles.songMeta}>
            {nowPlaying.artist} · {nowPlaying.duration}
          </Text>
        </View>
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${nowPlaying.progress * 100}%` }]} />
          <View style={[styles.knob, { left: `${nowPlaying.progress * 100}%` }]} />
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.time}>{nowPlaying.elapsed}</Text>
          <Text style={styles.time}>{nowPlaying.duration}</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={styles.tabItem}
              onPress={() => setTab(t.key)}
              activeOpacity={0.7}
            >
              <View style={styles.tabInner}>
                <Ionicons name={t.icon} size={15} color={on ? Colors.blue : Colors.textMuted} />
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
              </View>
              <View style={[styles.tabUnderline, on && styles.tabUnderlineOn]} />
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {tab === 'word' ? (
          <>
            <View style={styles.activeCard}>
              <View style={styles.activeHead}>
                {renderSentence()}
                <TouchableOpacity
                  style={styles.sentenceSpeak}
                  onPress={() => speak(activeLine.en)}
                  hitSlop={HIT}
                  activeOpacity={0.7}
                >
                  <Ionicons name="volume-medium" size={17} color={Colors.blue} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.activeZh, { fontSize: 13 * scale }]}>{activeLine.zh}</Text>
              {renderWordCard()}
            </View>

            {playingLyrics.map((l, i) =>
              i === activeIndex ? null : (
                <TouchableOpacity
                  key={l.id}
                  style={styles.line}
                  onPress={() => selectLine(i)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.lineEn, { fontSize: 15 * scale }]}>{l.en}</Text>
                  <Text style={styles.lineZh}>{l.zh}</Text>
                </TouchableOpacity>
              )
            )}
          </>
        ) : null}

        {tab === 'line'
          ? playingLyrics.map((l, i) => {
              const on = i === activeIndex;
              return (
                <TouchableOpacity
                  key={l.id}
                  style={[styles.line, on && styles.lineOn]}
                  onPress={() => setActiveIndex(i)}
                  activeOpacity={0.7}
                >
                  <View style={styles.lineHead}>
                    <Text style={[styles.lineEn, on && styles.lineEnOn, { fontSize: 15 * scale }]}>
                      {l.en}
                    </Text>
                    <Text style={[styles.lineTime, on && styles.lineTimeOn]}>{l.time}</Text>
                  </View>
                  <Text style={[styles.lineZh, on && styles.lineZhOn]}>{l.zh}</Text>
                </TouchableOpacity>
              );
            })
          : null}

        {tab === 'compare' ? (
          <View style={styles.compareCard}>
            <View style={styles.compareHead}>
              <Text style={styles.compareHeadText}>英文</Text>
              <Text style={[styles.compareHeadText, styles.compareRight]}>中文</Text>
            </View>
            {playingLyrics.map((l) => (
              <TouchableOpacity
                key={l.id}
                style={styles.compareRow}
                onPress={() => speak(l.en)}
                activeOpacity={0.7}
              >
                <Text style={[styles.compareEn, { fontSize: 14 * scale }]}>{l.en}</Text>
                <View style={styles.compareDivider} />
                <Text style={[styles.compareZh, { fontSize: 13 * scale }]}>{l.zh}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.card },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  topTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  aaBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  aaText: { fontSize: 16, fontWeight: '600', color: Colors.text },

  songRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 10 },
  cover: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverSun: { width: 26, height: 26, borderRadius: 13 },
  songInfo: { flex: 1, marginLeft: 12 },
  songTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  songMeta: { fontSize: 12.5, color: Colors.textMuted, marginTop: 3 },

  progressWrap: { paddingHorizontal: 16, marginTop: 16 },
  track: { height: 3, borderRadius: 2, backgroundColor: Colors.border },
  fill: { height: 3, borderRadius: 2, backgroundColor: Colors.blue },
  knob: {
    position: 'absolute',
    top: -4,
    marginLeft: -5.5,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: Colors.blue,
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  time: { fontSize: 11.5, color: Colors.textMuted },

  tabs: {
    flexDirection: 'row',
    marginTop: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingTop: 8 },
  tabInner: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tabText: { fontSize: 13, color: Colors.textSub },
  tabTextOn: { color: Colors.blue, fontWeight: '700' },
  tabUnderline: { height: 2, width: 26, borderRadius: 1, marginTop: 9, marginBottom: -1 },
  tabUnderlineOn: { backgroundColor: Colors.blue },

  body: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },

  activeCard: { backgroundColor: Colors.blueLight, borderRadius: 14, padding: 14 },
  activeHead: { flexDirection: 'row', alignItems: 'flex-start' },
  activeEn: { flex: 1, fontWeight: '700', color: Colors.blue, lineHeight: 24 },
  token: { textDecorationLine: 'underline', textDecorationColor: 'rgba(61,123,255,0.4)' },
  tokenOn: { color: Colors.blueDeep, textDecorationColor: Colors.blueDeep },
  sentenceSpeak: { marginLeft: 8, marginTop: 3 },
  activeZh: { color: Colors.textSub, marginTop: 10 },

  wordCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  wordClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordTop: { flexDirection: 'row', alignItems: 'center', paddingRight: 34 },
  wordText: { fontWeight: '700', color: Colors.text },
  wordPhonetic: { fontSize: 13, color: Colors.textMuted, marginLeft: 8 },
  wordSpeak: { marginLeft: 10 },
  wordMeaning: { color: Colors.textSub, marginTop: 8, lineHeight: 21 },
  wordPos: { color: Colors.textMuted, fontStyle: 'italic' },
  exampleEn: { color: Colors.blue, fontWeight: '600', marginTop: 12, lineHeight: 20 },
  exampleZh: { fontSize: 12.5, color: Colors.textMuted, marginTop: 5 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 14,
    marginHorizontal: -14,
    marginBottom: -14,
    paddingVertical: 11,
    backgroundColor: Colors.blueLight,
    borderTopWidth: 1,
    borderTopColor: Colors.primarySoft,
    borderBottomLeftRadius: 13,
    borderBottomRightRadius: 13,
  },
  addBtnOn: { backgroundColor: Colors.surfaceSoft, borderTopColor: Colors.border },
  addText: { fontSize: 13, fontWeight: '600', color: Colors.blue },
  addTextOn: { color: Colors.textMuted },

  line: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginTop: 6 },
  lineOn: { backgroundColor: 'rgba(61,123,255,0.06)' },
  lineHead: { flexDirection: 'row', alignItems: 'baseline' },
  lineEn: { flex: 1, color: Colors.text, fontWeight: '600', lineHeight: 22 },
  lineEnOn: { color: Colors.blue, fontWeight: '700' },
  lineTime: { fontSize: 11, color: Colors.textMuted, marginLeft: 8 },
  lineTimeOn: { color: Colors.blue },
  lineZh: { fontSize: 13, color: Colors.textMuted, marginTop: 5, lineHeight: 19 },
  lineZhOn: { color: Colors.textSub },

  compareCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  compareHead: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  compareHeadText: { flex: 1, fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  compareRight: { paddingLeft: 14 },
  compareRow: { flexDirection: 'row', paddingVertical: 12 },
  compareEn: { flex: 1, color: Colors.text, fontWeight: '600', lineHeight: 21 },
  compareDivider: { width: 1, backgroundColor: Colors.divider, marginHorizontal: 14 },
  compareZh: { flex: 1, color: Colors.textSub, lineHeight: 20 },
});
