import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../theme/colors';
import { listenOptions, listenQuestion, nowPlaying, recommendSongs } from '../data/mock';
import { pronounceWord } from '../utils/speech';
import { showToast } from '../utils/toast';

/** 正确答案（对应 listenOptions 的 id） */
const ANSWER = 'a';
/** 题目进度 */
const CURRENT = 2;
const TOTAL = 5;
/** 音频波形柱高（模拟波形） */
const WAVE = [10, 17, 8, 21, 13, 25, 11, 19, 9, 15, 23, 12, 18, 14, 22];
/** 小图标点击热区 */
const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

export const ListeningScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [picked, setPicked] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 背景取正在练习的歌曲封面，作为模糊后的专辑底色 */
  const cover = useMemo(() => {
    const song = recommendSongs.find((s) => s.title === nowPlaying.title);
    return song ? song.cover : nowPlaying.cover;
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const play = () => {
    setPlaying(true);
    pronounceWord('I drew a line and crossed it.', { rate: 0.85 });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPlaying(false), 1600);
  };

  const next = () => {
    if (!picked) {
      showToast('请先选择一个答案', 'info');
      return;
    }
    if (picked === ANSWER) {
      showToast('答对了，进入下一题', 'success');
    } else {
      showToast('答错了，正确答案是 crossed', 'info');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* 模糊后的专辑封面底色 */}
      <LinearGradient
        colors={[cover[0], cover[1]]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.dim]} />

      {/* 顶部：返回 / 标题 / 进度 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={onBack} hitSlop={HIT}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>听力练习</Text>
        <Text style={styles.headerStep}>
          {CURRENT}/{TOTAL}
        </Text>
      </View>

      {/* 题目卡片 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Listen &amp; Choose</Text>
        <Text style={styles.cardSub}>听音选择正确的单词</Text>

        {/* 音频条 */}
        <View style={styles.audio}>
          <TouchableOpacity style={styles.playBtn} onPress={play} activeOpacity={0.85}>
            <Ionicons name={playing ? 'pause' : 'play'} size={18} color="#fff" />
          </TouchableOpacity>
          <View style={styles.waveRow}>
            {WAVE.map((h, i) => (
              <View key={i} style={[styles.wave, { height: h }]} />
            ))}
          </View>
          <Text style={styles.duration}>00:12</Text>
        </View>

        {/* 题干 */}
        <Text style={styles.question}>{listenQuestion}</Text>

        {/* 选项 */}
        <View style={styles.options}>
          {listenOptions.map((o) => {
            const on = picked === o.id;
            const right = on && o.id === ANSWER;
            const wrong = on && o.id !== ANSWER;
            return (
              <TouchableOpacity
                key={o.id}
                style={[styles.option, right && styles.optionRight, wrong && styles.optionWrong]}
                onPress={() => setPicked(o.id)}
                activeOpacity={0.9}
              >
                <Text style={styles.optText}>{o.text}</Text>
                {right ? <Ionicons name="checkmark" size={20} color={Colors.mint} /> : null}
                {wrong ? <Ionicons name="close" size={20} color={Colors.coral} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={next} activeOpacity={0.85}>
          <Text style={styles.nextText}>下一题</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  /** 压暗底色，让白卡片更突出 */
  dim: { backgroundColor: 'rgba(16, 22, 42, 0.5)' },

  // 顶部
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  back: { width: 36 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#fff' },
  headerStep: {
    width: 36,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },

  // 卡片
  card: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: Colors.card,
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
  },
  cardTitle: { fontSize: 19, fontWeight: '700', color: Colors.text },
  cardSub: { fontSize: 13, color: Colors.textMuted, marginTop: 6 },

  // 音频条
  audio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    backgroundColor: Colors.blueLight,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveRow: { flex: 1, height: 26, flexDirection: 'row', alignItems: 'center', gap: 3 },
  wave: { width: 3, borderRadius: 2, backgroundColor: '#C6D2E8' },
  duration: { fontSize: 12, color: Colors.textMuted, marginRight: 4 },

  // 题干
  question: { fontSize: 15, color: Colors.text, lineHeight: 23, marginTop: 20 },

  // 选项
  options: { marginTop: 16, gap: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  optionRight: { backgroundColor: Colors.mintLight, borderColor: Colors.mint },
  optionWrong: { backgroundColor: Colors.coralLight, borderColor: Colors.coral },
  optText: { flex: 1, fontSize: 15, color: Colors.text },

  // 底部按钮
  nextBtn: {
    marginTop: 22,
    backgroundColor: Colors.blue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
