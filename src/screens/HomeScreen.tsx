import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { recommendSongs, homeBanner } from '../data/mock';

export const HomeScreen: React.FC<{ onOpen: (name: string) => void }> = ({ onOpen }) => {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.greetRow}>
          <View style={styles.greetText}>
            <Text style={styles.greeting}>Good morning 👋</Text>
            <Text style={styles.subGreeting}>让好听的歌，成为你的英语课堂</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={18} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.searchBox} activeOpacity={0.8}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <Text style={styles.searchText}>搜索歌曲、歌手或专辑...</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={homeBanner.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <View style={styles.bannerGlow} />
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>{homeBanner.title}</Text>
            <Text style={styles.bannerDesc}>{homeBanner.desc}</Text>
          </View>
          <TouchableOpacity style={styles.bannerPlay} onPress={() => onOpen('Player')}>
            <Ionicons name="play" size={16} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>为你推荐</Text>
          <TouchableOpacity style={styles.moreBox}>
            <Text style={styles.moreText}>查看更多</Text>
            <Ionicons name="chevron-forward" size={12} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {recommendSongs.map((s) => (
            <TouchableOpacity key={s.id} style={styles.songCard} onPress={() => onOpen('Player')}>
              <LinearGradient colors={s.cover} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.cover}>
                <Text style={styles.coverMark}>{s.title.charAt(0)}</Text>
              </LinearGradient>
              <Text style={styles.songTitle} numberOfLines={1}>{s.title}</Text>
              <Text style={styles.songArtist} numberOfLines={1}>{s.artist}</Text>
              <View style={styles.levelTag}><Text style={styles.levelText}>{s.level}</Text></View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>最近播放</Text>
          <TouchableOpacity style={styles.moreBox}>
            <Text style={styles.moreText}>查看更多</Text>
            <Ionicons name="chevron-forward" size={12} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
        {recommendSongs.slice(0, 2).map((s) => (
          <TouchableOpacity key={s.id} style={styles.recentRow} onPress={() => onOpen('Player')}>
            <LinearGradient colors={s.cover} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.recentCover}>
              <Text style={styles.recentMark}>{s.title.charAt(0)}</Text>
            </LinearGradient>
            <View style={styles.recentInfo}>
              <Text style={styles.recentTitle} numberOfLines={1}>{s.title}</Text>
              <Text style={styles.recentMeta}>{s.artist} · {s.duration}</Text>
            </View>
            <TouchableOpacity style={styles.recentMore}>
              <Ionicons name="ellipsis-horizontal" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { backgroundColor: Colors.card, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 },
  greetRow: { flexDirection: 'row', alignItems: 'flex-start' },
  greetText: { flex: 1 },
  greeting: { fontSize: 22, fontWeight: '700', color: Colors.text },
  subGreeting: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  bellBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceSoft,
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 40,
    marginTop: 14,
  },
  searchText: { color: Colors.textMuted, fontSize: 13 },
  body: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  banner: {
    height: 116,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bannerGlow: {
    position: 'absolute',
    right: -30,
    bottom: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  bannerDesc: { fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 8 },
  bannerPlay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  moreBox: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  moreText: { fontSize: 12, color: Colors.textMuted },
  row: { gap: 12 },
  songCard: { width: 104 },
  cover: {
    width: 104,
    height: 104,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverMark: { fontSize: 30, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  songTitle: { fontSize: 13, fontWeight: '600', color: Colors.text, marginTop: 8 },
  songArtist: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  levelTag: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.blue,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: 6,
  },
  levelText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  recentCover: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentMark: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  recentInfo: { flex: 1, marginLeft: 12 },
  recentTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  recentMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  recentMore: { paddingHorizontal: 4, paddingVertical: 6 },
});
