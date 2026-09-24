import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { vocabList } from '../data/mock';
import { pronounceWord } from '../utils/speech';
import { showToast } from '../utils/toast';

/** 小图标点击热区，避免手指点不中 */
const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

export const VocabScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  /** 已学习的单词集合，键为单词 id */
  const [learned, setLearned] = useState<Record<string, boolean>>(() =>
    vocabList.reduce<Record<string, boolean>>((acc, v) => {
      if (v.learned) acc[v.id] = true;
      return acc;
    }, {})
  );

  const learnedCount = useMemo(
    () => vocabList.filter((v) => learned[v.id]).length,
    [learned]
  );
  const percent = vocabList.length
    ? Math.round((learnedCount / vocabList.length) * 100)
    : 0;

  const toggleLearned = (id: string) =>
    setLearned((prev) => ({ ...prev, [id]: !prev[id] }));

  const startReview = () => {
    const rest = vocabList.length - learnedCount;
    if (rest > 0) {
      showToast(`还有 ${rest} 个单词待复习`, 'info');
    } else {
      showToast('全部单词都已掌握', 'success');
    }
  };

  /** 例句中把目标词高亮出来（含 -s / -ed 等变形） */
  const renderExample = (sentence: string, word: string) => {
    const parts = sentence.split(new RegExp(`(${word}\\w*)`, 'i'));
    return (
      <Text style={styles.example}>
        {parts.map((part, i) =>
          part.toLowerCase().startsWith(word.toLowerCase()) ? (
            <Text key={`${part}-${i}`} style={styles.exampleWord}>
              {part}
            </Text>
          ) : (
            part
          )
        )}
      </Text>
    );
  };

  return (
    <View style={styles.root}>
      {/* 顶部：本首歌重点词汇 + 学习进度 */}
      <LinearGradient
        colors={[Colors.indigo, Colors.indigoDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onBack} hitSlop={HIT}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onBack} hitSlop={HIT}>
            <Ionicons name="close" size={22} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        <Text style={styles.heroTitle}>本首歌重点词汇</Text>
        <Text style={styles.heroSub}>
          共 {vocabList.length} 个单词 · 已学习 {learnedCount} 个
        </Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percent}%` }]} />
          <Text style={styles.progressPct}>{percent}%</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {vocabList.map((v) => {
          const on = !!learned[v.id];
          return (
            <View key={v.id} style={styles.card}>
              {/* 单词 + 英式发音 + 勾选 */}
              <View style={styles.cardHead}>
                <View style={styles.cardHeadLeft}>
                  <Text style={styles.word}>{v.word}</Text>
                  <TouchableOpacity
                    onPress={() => pronounceWord(v.word, { accent: 'en-GB' })}
                    hitSlop={HIT}
                  >
                    <Ionicons name="volume-medium" size={17} color={Colors.violetDeep} />
                  </TouchableOpacity>
                  <Text style={styles.phonetic} numberOfLines={1}>
                    {v.phoneticUk}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.check, on && styles.checkOn]}
                  onPress={() => toggleLearned(v.id)}
                  activeOpacity={0.7}
                  hitSlop={HIT}
                >
                  {on ? <Ionicons name="checkmark" size={15} color="#fff" /> : null}
                </TouchableOpacity>
              </View>

              {/* 美式发音 */}
              <View style={styles.phoneticRow}>
                <Text style={styles.phonetic}>{v.phoneticUs}</Text>
                <TouchableOpacity
                  onPress={() => pronounceWord(v.word, { accent: 'en-US' })}
                  hitSlop={HIT}
                >
                  <Ionicons name="volume-medium" size={15} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* 词性 + 释义 */}
              <Text style={styles.meaning}>
                <Text style={styles.pos}>{v.pos} </Text>
                {v.meaning}
              </Text>

              {/* 例句 + 翻译 */}
              {renderExample(v.example, v.word)}
              <Text style={styles.exampleZh}>{v.exampleZh}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* 底部操作 */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryBtn} onPress={startReview} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>开始复习</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  // 顶部
  hero: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 12 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 6 },
  progressTrack: {
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginTop: 14,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  progressPct: {
    alignSelf: 'flex-end',
    marginRight: 10,
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },

  // 词卡列表
  body: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardHeadLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { fontSize: 18, fontWeight: '700', color: Colors.text },
  phonetic: { fontSize: 13, color: Colors.violetDeep },
  phoneticRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },

  // 已学习勾选
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    marginTop: 2,
  },
  checkOn: { backgroundColor: Colors.violetDeep, borderColor: Colors.violetDeep },

  // 释义与例句
  meaning: { fontSize: 13, color: Colors.text, marginTop: 10, lineHeight: 20 },
  pos: { color: Colors.violetDeep, fontWeight: '600' },
  example: { fontSize: 13, color: Colors.text, marginTop: 8, lineHeight: 21 },
  exampleWord: { color: Colors.violetDeep, fontWeight: '700' },
  exampleZh: { fontSize: 12, color: Colors.textMuted, marginTop: 4, lineHeight: 20 },

  // 底部按钮
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  primaryBtn: {
    backgroundColor: Colors.violetDeep,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
