import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

const TASKS = [
  { id: 't1', icon: 'list', color: Colors.blue, title: '歌词学习', desc: 'Perfect · 6 句待学习', right: '去学习', route: 'Lyrics' },
  { id: 't2', icon: 'book', color: Colors.violet, title: '词汇复习', desc: '12 个单词待复习', right: '去复习', route: 'Vocab' },
  { id: 't3', icon: 'ear', color: Colors.mint, title: '听力练习', desc: '今日剩余 8 题', right: '去练习', route: 'Listening' },
  { id: 't4', icon: 'mic', color: Colors.gold, title: '跟读练习', desc: '今日剩余 5 句', right: '去跟读', route: 'Shadowing' },
];

export const StudyScreen: React.FC<{ onOpen: (n: string) => void }> = ({ onOpen }) => {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>学习</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {TASKS.map((t) => (
          <TouchableOpacity key={t.id} style={styles.task} onPress={() => onOpen(t.route)}>
            <View style={[styles.taskIcon, { backgroundColor: t.color + '22' }]}>
              <Ionicons name={t.icon as any} size={20} color={t.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.taskTitle}>{t.title}</Text>
              <Text style={styles.taskDesc}>{t.desc}</Text>
            </View>
            <Text style={styles.taskGo}>{t.right}</Text>
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
  task: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  taskIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  taskTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  taskDesc: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  taskGo: { fontSize: 12, color: Colors.blue, fontWeight: '600' },
});