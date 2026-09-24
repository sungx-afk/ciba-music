import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { ProgressBar } from '../components/ProgressBar';

/** 顶部概览：今日学习 / 累计学习 / 学过歌曲 */
const STATS = [
  { k: '今日学习', v: '18', u: '分钟' },
  { k: '累计学习', v: '12', u: '天' },
  { k: '学过歌曲', v: '24', u: '首' },
];

/** 常用功能入口 */
const MENU: { key: string; label: string; icon: string }[] = [
  { key: 'fav', label: '我的收藏', icon: 'heart-outline' },
  { key: 'vocab', label: '生词本', icon: 'book-outline' },
  { key: 'record', label: '学习记录', icon: 'time-outline' },
  { key: 'settings', label: '设置', icon: 'settings-outline' },
];

/** 我的学习进度（0 - 1） */
const PROGRESS = 0.45;

export const ProfileScreen: React.FC = () => {
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* 用户信息：头像 + 昵称 + 等级 */}
        <View style={styles.userCard}>
          <LinearGradient
            colors={['#7FB2FF', '#3D7BFF']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.avatar}
          >
            <Ionicons name="person" size={30} color="#fff" />
          </LinearGradient>
          <View style={styles.userInfo}>
            <Text style={styles.name}>英语学习者</Text>
            <View style={styles.levelPill}>
              <Text style={styles.levelText}>B1 · 中级</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </View>

        {/* 学习概览 */}
        <View style={styles.statsRow}>
          {STATS.map((s) => (
            <View key={s.k} style={styles.statCard}>
              <Text style={styles.statKey}>{s.k}</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{s.v}</Text>
                <Text style={styles.statUnit}>{s.u}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 我的学习进度 */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>我的学习进度</Text>
            <Text style={styles.progressPercent}>{Math.round(PROGRESS * 100)}%</Text>
          </View>
          <ProgressBar progress={PROGRESS} height={8} color={Colors.blue} />
        </View>

        {/* 功能列表 */}
        <View style={styles.menuCard}>
          {MENU.map((m, i) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.menuRow, i > 0 && styles.menuDivider]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={m.icon as any}
                size={20}
                color={Colors.textSub}
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>{m.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.card },
  body: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 },

  // 用户信息
  userCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: { flex: 1, minWidth: 0, marginLeft: 14 },
  name: { fontSize: 20, fontWeight: '700', color: Colors.text },
  levelPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceSoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 8,
  },
  levelText: { fontSize: 11, fontWeight: '600', color: Colors.textSub },

  // 学习概览
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 22 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surfaceSoft,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  statKey: { fontSize: 12, color: Colors.textMuted },
  statValueRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 },
  statValue: { fontSize: 24, fontWeight: '700', color: Colors.blue, lineHeight: 28 },
  statUnit: { fontSize: 11, color: Colors.textMuted, marginLeft: 3, marginBottom: 3 },

  // 卡片通用
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginTop: 16,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  progressPercent: { fontSize: 14, fontWeight: '700', color: Colors.blue },

  // 功能列表
  menuCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginTop: 16,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  menuDivider: { borderTopWidth: 1, borderTopColor: Colors.divider },
  // 图标只作固定宽的占位，保证各行文字左对齐
  menuIcon: { width: 24, marginRight: 12 },
  menuText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },
});
