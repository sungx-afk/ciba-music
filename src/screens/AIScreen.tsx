import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { aiInsights } from '../data/mock';

const ASKS = ['解释难点', '语法讲解', '地道表达', '练习建议'];

export const AIScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [ask, setAsk] = useState(0);
  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onBack}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>AI 智能分析</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={styles.heroSub}>Blinding Lights · The Weeknd</Text>
      </View>
      <View style={styles.askRow}>
        {ASKS.map((a, i) => (
          <TouchableOpacity
            key={a}
            style={[styles.ask, i === ask && styles.askOn]}
            onPress={() => setAsk(i)}
          >
            <Text style={[styles.askText, i === ask && styles.askTextOn]}>{a}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {aiInsights.map((it) => (
          <View key={it.id} style={styles.item}>
            <View style={styles.itemHead}>
              <Ionicons name="sparkles" size={15} color={Colors.violet} />
              <Text style={styles.itemTitle}>{it.title}</Text>
            </View>
            <Text style={styles.itemBody}>{it.body}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.inputBar}>
        <Text style={styles.inputText}>问问 AI 老师...</Text>
        <TouchableOpacity style={styles.send}>
          <Ionicons name="send" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  hero: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 12 },
  askRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 14 },
  ask: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  askOn: { backgroundColor: Colors.violet },
  askText: { fontSize: 12, color: Colors.textSub },
  askTextOn: { color: '#fff', fontWeight: '600' },
  body: { padding: 16, paddingBottom: 16 },
  item: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 12 },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  itemBody: { fontSize: 13, color: Colors.textSub, marginTop: 8, lineHeight: 20 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 16,
    backgroundColor: Colors.card,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inputText: { flex: 1, fontSize: 13, color: Colors.textMuted },
  send: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
});