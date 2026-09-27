import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { WordDetail, searchWord } from '../services/wordApi';
import { addWordToBookmark } from '../services/bookmarkApi';
import { playWordAudio, stopWordAudio } from '../utils/wordAudio';
import { showToast } from '../utils/toast';

interface Props {
  /** 要查询的单词；null 表示关闭 */
  wordName: string | null;
  onClose: () => void;
}

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

/**
 * 点歌词里的单词后弹出的查词卡片：
 * 音标（英/美，可点发音）+ 词性释义，底部「添加到生词本」。
 * 加生词本复用已有的 /anki/movie2card.json（默认电影词库）。
 */
export const WordLookupCard: React.FC<Props> = ({ wordName, onClose }) => {
  const [detail, setDetail] = useState<WordDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const open = wordName !== null;

  useEffect(() => {
    if (!wordName) return;
    let alive = true;
    setLoading(true);
    setError('');
    setDetail(null);
    setAdded(false);
    searchWord(wordName)
      .then((d) => {
        if (!alive) return;
        setDetail(d);
        setAdded(d.added);
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(e?.message || '查词失败，请稍后重试');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [wordName]);

  /** 关闭时停掉发音 */
  useEffect(() => {
    if (!open) void stopWordAudio();
  }, [open]);

  useEffect(() => () => void stopWordAudio(), []);

  const onAdd = async () => {
    if (!detail || added || adding) return;
    setAdding(true);
    try {
      await addWordToBookmark(detail.wordName);
      setAdded(true);
      showToast('已加入生词本', 'success');
    } catch (e: any) {
      showToast(e?.message || '加入生词本失败', 'info');
    } finally {
      setAdding(false);
    }
  };

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.stateBox}>
          <ActivityIndicator color={Colors.blue} />
          <Text style={styles.stateText}>查询中…</Text>
        </View>
      );
    }
    if (error || !detail) {
      return (
        <View style={styles.stateBox}>
          <Ionicons name="alert-circle-outline" size={22} color={Colors.textMuted} />
          <Text style={styles.stateText}>{error || '未查到该单词'}</Text>
        </View>
      );
    }

    const example = detail.sentences[0];

    return (
      <>
        {/* 音标：英 / 美，点一下发音 */}
        <View style={styles.phonRow}>
          {detail.phEn ? (
            <TouchableOpacity
              style={styles.phonItem}
              activeOpacity={0.7}
              onPress={() => playWordAudio(detail.phEnMp3, detail.wordName, 'en-GB')}
            >
              <Text style={styles.phonLabel}>英</Text>
              <Text style={styles.phonText}>/{detail.phEn}/</Text>
              <Ionicons name="volume-medium-outline" size={15} color={Colors.blue} />
            </TouchableOpacity>
          ) : null}
          {detail.phAm ? (
            <TouchableOpacity
              style={styles.phonItem}
              activeOpacity={0.7}
              onPress={() => playWordAudio(detail.phAmMp3, detail.wordName, 'en-US')}
            >
              <Text style={styles.phonLabel}>美</Text>
              <Text style={styles.phonText}>/{detail.phAm}/</Text>
              <Ionicons name="volume-medium-outline" size={15} color={Colors.blue} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* 词性释义 */}
        {detail.speechParts.length ? (
          <View style={styles.meanBox}>
            {detail.speechParts.map((p, i) => (
              <Text key={`${p.partName}-${i}`} style={styles.meanLine}>
                {p.partName ? <Text style={styles.pos}>{p.partName} </Text> : null}
                {p.means.map((m) => m.wordMean).join('；')}
              </Text>
            ))}
          </View>
        ) : null}

        {/* 首条例句 */}
        {example ? (
          <View style={styles.example}>
            <Text style={styles.exampleEn}>{example.english}</Text>
            {example.chinese ? <Text style={styles.exampleZh}>{example.chinese}</Text> : null}
          </View>
        ) : null}

        {/* 加入生词本 */}
        <TouchableOpacity
          style={[styles.addBtn, added && styles.addBtnOn]}
          onPress={onAdd}
          activeOpacity={0.85}
          disabled={added || adding}
        >
          <Ionicons
            name={added ? 'checkmark-circle' : 'add-circle-outline'}
            size={17}
            color={added ? Colors.textMuted : '#fff'}
          />
          <Text style={[styles.addText, added && styles.addTextOn]}>
            {adding ? '添加中…' : added ? '已加入生词本' : '添加到生词本'}
          </Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        {/* 内层阻止冒泡：点卡片本身不关闭 */}
        <TouchableOpacity style={styles.card} activeOpacity={1} onPress={() => undefined}>
          <View style={styles.head}>
            <Text style={styles.word} numberOfLines={1}>
              {detail?.wordName || wordName || ''}
            </Text>
            <TouchableOpacity style={styles.close} onPress={onClose} hitSlop={HIT} activeOpacity={0.7}>
              <Ionicons name="close" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
          {renderBody()}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,17,34,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  word: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 0.3,
  },
  close: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  phonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 10 },
  phonItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  phonLabel: { fontSize: 12, color: Colors.textMuted },
  phonText: { fontSize: 14, color: Colors.textSub },

  meanBox: { marginTop: 14 },
  meanLine: { fontSize: 15, color: Colors.text, lineHeight: 23 },
  pos: { color: Colors.textMuted, fontStyle: 'italic' },

  example: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  exampleEn: { fontSize: 13.5, color: Colors.blue, fontWeight: '600', lineHeight: 20 },
  exampleZh: { fontSize: 12.5, color: Colors.textMuted, marginTop: 4, lineHeight: 18 },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.mint,
  },
  addBtnOn: { backgroundColor: Colors.surfaceSoft },
  addText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  addTextOn: { color: Colors.textMuted },

  stateBox: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 28 },
  stateText: { fontSize: 13, color: Colors.textMuted },
});
