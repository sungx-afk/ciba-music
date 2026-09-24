import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { nowPlaying, recommendSongs, shadowSentences } from '../data/mock';
import { pronounceWord } from '../utils/speech';
import { showToast } from '../utils/toast';

const START = 2;
const GREEN = '#1EB148';

const WAVE = [4,5,7,12,6,10,5,8,15,23,34,18,9,5,5,10,16,21,14,12,8,15,5,7,13,30,19,11,7,5,9,18,31,20,12,6,5,8,15,4];
const HIT = { top: 8, bottom: 8, left: 10, right: 10 };

export const ShadowingScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(START);
  const [recording, setRecording] = useState(false);
  const [tick, setTick] = useState(0);

  const sentence = shadowSentences[index];

  const cover = useMemo(() => {
    const song = recommendSongs.find((s) => s.title === nowPlaying.title);
    return song ? song.cover : nowPlaying.cover;
  }, []);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setTick((t) => t + 1), 120);
    return () => clearInterval(id);
  }, [recording]);

  const toggle = () => {
    if (!recording) {
      pronounceWord(sentence.en, { rate: 0.85 });
      setRecording(true);
      setTick(0);
      return;
    }
    setRecording(false);
  };

  const redo = () => {
    setRecording(false);
    setTick(0);
    showToast('已重置，可以再录一次', 'info');
  };

  const next = () => {
    if (index >= shadowSentences.length - 1) {
      showToast('已经是最后一句啦', 'success');
      return;
    }
    setRecording(false);
    setTick(0);
    setIndex(index + 1);
  };

  const bars = WAVE.map((h, i) => h * (recording ? 0.6 + ((i + tick) % 5) * 0.18 : 1));

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[cover[1], cover[0], '#0A1730']}
        locations={[0, 0.42, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.dim]} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>跟读练习</Text>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={onBack} hitSlop={HIT}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.step}>{index + 1}/{shadowSentences.length}</Text>
        </View>
      </View>

      <View style={styles.sentenceBox}>
        <Text style={styles.en}>{sentence.en}</Text>
        <Text style={styles.zh}>{sentence.zh}</Text>
      </View>

      <View style={styles.micArea}>
        <View style={[styles.ringOuter, recording && styles.ringOuterOn]}>
          <View style={[styles.ringInner, recording && styles.ringInnerOn]}>
            <TouchableOpacity style={styles.micBtn} onPress={toggle} activeOpacity={0.85}>
              <Ionicons name={recording ? 'stop' : 'mic'} size={34} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.waveBox}>
        <View style={styles.waveRow}>
          {bars.map((h, i) => (
            <View key={i} style={[styles.wave, { height: h }]} />
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.check}>
            <Ionicons name="checkmark" size={16} color="#fff" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.scoreText}>
              发音评分 <Text style={styles.scoreNum}>{sentence.score} 分</Text>
            </Text>
            <Text style={styles.cardSub}>很棒！你的发音非常接近原声。</Text>
          </View>
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 14 }]}>
        <TouchableOpacity style={styles.ghostBtn} onPress={redo} activeOpacity={0.85}>
          <Text style={styles.ghostText}>重录</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextBtn} onPress={next} activeOpacity={0.85}>
          <Text style={styles.nextText}>下一句</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  dim: { backgroundColor: 'rgba(9, 14, 28, 0.62)' },

  header: { paddingHorizontal: 16 },
  headerTitle: { textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#fff' },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  step: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },

  sentenceBox: { alignItems: 'center', paddingHorizontal: 24, marginTop: 28 },
  en: { textAlign: 'center', fontSize: 20, fontWeight: '700', color: '#fff', lineHeight: 27 },
  zh: { marginTop: 8, fontSize: 13.5, color: 'rgba(255,255,255,0.72)' },

  micArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ringOuter: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(96,143,255,0.12)',
  },
  ringOuterOn: { backgroundColor: 'rgba(96,143,255,0.2)' },
  ringInner: {
    width: 118,
    height: 118,
    borderRadius: 59,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(96,143,255,0.18)',
  },
  ringInnerOn: { backgroundColor: 'rgba(96,143,255,0.3)' },
  micBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },

  waveBox: { alignItems: 'center', paddingHorizontal: 24, marginTop: 20 },
  waveRow: { flexDirection: 'row', alignItems: 'center', height: 34, gap: 1.8 },
  wave: { width: 3.6, borderRadius: 2, backgroundColor: Colors.blue },

  card: {
    marginHorizontal: 24,
    marginTop: 26,
    backgroundColor: '#F7FAFF',
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, marginLeft: 12 },
  scoreText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  scoreNum: { color: GREEN, fontWeight: '700' },
  cardSub: { marginTop: 6, fontSize: 13, color: Colors.textMuted },

  bottom: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginTop: 26 },
  ghostBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  ghostText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  nextBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.blue,
  },
  nextText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
