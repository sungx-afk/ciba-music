import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { recommendSongs } from '../data/mock';

export const MyMusicScreen: React.FC<{ onOpen: (n: string) => void }> = ({ onOpen }) => {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>我的音乐</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.twoCol}>
          <TouchableOpacity style={styles.bigTile} onPress={() => onOpen('Player')}>
            <Ionicons name="heart" size={20} color={Colors.coral} />
            <Text style={styles.bigText}>我喜欢的</Text>
            <Text style={styles.bigSub}>32 首</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bigTile} onPress={() => onOpen('Player')}>
            <Ionicons name="download" size={20} color={Colors.blue} />
            <Text style={styles.bigText}>已下载</Text>
            <Text style={styles.bigSub}>12 首</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.section}>最近学习</Text>
        {recommendSongs.map((s) => (
          <TouchableOpacity key={s.id} style={styles.row} onPress={() => onOpen('Player')}>
            <View style={[styles.cover, { backgroundColor: s.tint }]}>
              <Ionicons name="musical-note" size={16} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{s.title}</Text>
              <Text style={styles.rowSub}>{s.artist} · {s.duration}</Text>
            </View>
            <View style={styles.tag}><Text style={styles.tagText}>{s.level}</Text></View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  body: { padding: 16, paddingBottom: 24 },
  twoCol: { flexDirection: 'row', gap: 12 },
  bigTile: { flex: 1, backgroundColor: Colors.card, borderRadius: 14, padding: 14 },
  bigText: { fontSize: 13, fontWeight: '600', color: Colors.text, marginTop: 8 },
  bigSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  section: { fontSize: 15, fontWeight: '700', color: Colors.text, marginTop: 22, marginBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cover: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  rowSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  tag: { backgroundColor: Colors.blueLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 10, color: Colors.blueDeep, fontWeight: '600' },
});