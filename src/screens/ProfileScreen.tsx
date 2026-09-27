import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { ProgressBar } from '../components/ProgressBar';
import { ConfirmDialog, DialogPayload } from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

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

/** 手机号脱敏：138****8888 */
const maskMobile = (m?: string) => {
  if (!m) return '';
  return m.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
};

type OpenFn = (name: string, params?: Record<string, any>) => void;

export const ProfileScreen: React.FC<{ onOpen?: OpenFn }> = ({ onOpen }) => {
  /** 顶部避开状态栏（底部由 TabBar 负责） */
  const insets = useSafeAreaInsets();
  const { user, isLoggedIn, logout, refreshUserInfo } = useAuth();
  const [dialog, setDialog] = useState<DialogPayload | null>(null);

  /** 用户资料里的 vip 字段为 1 表示付费会员 */
  const isVip = Number(user?.vip) === 1;

  const open = (name: string) => onOpen?.(name);

  // 每次进「我的」顺手刷一次会员状态，别处刚买/刚改的资料能同步过来
  useEffect(() => {
    void refreshUserInfo();
    // 只在挂载时执行一次：refreshUserInfo 每次渲染都是新函数，放进依赖会死循环
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 登录态下的展示名：昵称 > 账号 > 脱敏手机号 */
  const displayName = isLoggedIn
    ? user?.nickname || user?.loginName || maskMobile(user?.mobile) || '糍粑学员'
    : '未登录';
  const displaySub = isLoggedIn
    ? maskMobile(user?.mobile) || user?.email || '学习进度已开启多端同步'
    : '登录后可同步学习进度与会员权益';

  const handleLogout = () => {
    setDialog({
      title: '退出登录',
      message: '确定要退出当前账号吗？',
      confirmText: '退出登录',
      onConfirm: () => logout(),
    });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* 用户信息：头像 + 昵称 + 会员状态，未登录时整块作为登录入口 */}
        <TouchableOpacity
          style={styles.userCard}
          activeOpacity={isLoggedIn ? 1 : 0.7}
          onPress={() => !isLoggedIn && open('Login')}
        >
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={
                isVip
                  ? ['#FFD88A', Colors.gold]
                  : isLoggedIn
                  ? ['#7FB2FF', '#3D7BFF']
                  : ['#C9D4E4', '#93A1B5']
              }
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.avatar}
            >
              <Ionicons
                name={isLoggedIn ? 'person' : 'log-in-outline'}
                size={30}
                color="#fff"
              />
            </LinearGradient>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={[styles.levelPill, isVip && styles.vipPill]}>
              <Ionicons
                name={isVip ? 'diamond' : 'person-outline'}
                size={11}
                color={isVip ? Colors.goldDeep : Colors.textSub}
              />
              <Text style={[styles.levelText, isVip && styles.vipText]}>
                {isLoggedIn ? (isVip ? 'VIP 会员' : '免费用户') : '游客模式'}
              </Text>
            </View>
            <Text style={styles.userSub} numberOfLines={1}>
              {displaySub}
            </Text>
          </View>
          {isLoggedIn ? null : (
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          )}
        </TouchableOpacity>

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

        {/* 账号相关：登录 / 注册 / 修改密码 / 退出登录 */}
        <View style={styles.menuCard}>
          {isLoggedIn ? (
            <>
              <TouchableOpacity style={styles.menuRow} activeOpacity={0.7} onPress={() => open('ChangePassword')}>
                <Ionicons
                  name="key-outline"
                  size={20}
                  color={Colors.textSub}
                  style={styles.menuIcon}
                />
                <Text style={styles.menuText}>修改密码</Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuRow, styles.menuDivider]}
                activeOpacity={0.7}
                onPress={handleLogout}
              >
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color={Colors.danger}
                  style={styles.menuIcon}
                />
                <Text style={[styles.menuText, styles.logoutText]}>退出登录</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.menuRow} activeOpacity={0.7} onPress={() => open('Login')}>
              <Ionicons
                name="log-in-outline"
                size={20}
                color={Colors.blue}
                style={styles.menuIcon}
              />
              <Text style={[styles.menuText, styles.loginText]}>登录 / 注册</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={!!dialog}
        {...(dialog as DialogPayload)}
        onClose={() => setDialog(null)}
      />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceSoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 8,
  },
  levelText: { fontSize: 11, fontWeight: '600', color: Colors.textSub },
  vipPill: { backgroundColor: Colors.goldLight },
  vipText: { color: Colors.goldDeep },
  userSub: { fontSize: 12, color: Colors.textMuted, marginTop: 8 },

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
  loginText: { color: Colors.blueDeep },
  logoutText: { color: Colors.danger },
});
