import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { ConfirmDialog, DialogPayload } from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../storage/progressStore';
import {
  fetchNotebookDayLimit,
  saveNotebookDayLimit,
  NOTEBOOK_DAY_LIMIT_OPTIONS,
  NOTEBOOK_DAY_LIMIT_MAX,
} from '../services/bookmarkApi';
import { AGREEMENT_URL, POLICY_URL } from '../config/legal';

/** 与 package.json 同步，避免审核员看到不一致的版本号 */
const APP_VERSION = '1.0.0';

/** 常用功能入口 */
const MENU: { key: string; label: string; icon: string }[] = [
  { key: 'fav', label: '我的收藏', icon: 'heart-outline' },
  { key: 'vocab', label: '生词本', icon: 'book-outline' },
  { key: 'record', label: '学习记录', icon: 'time-outline' },
  { key: 'settings', label: '设置', icon: 'settings-outline' },
];

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
  const { state: progress, stats, updateSettings } = useProgress();
  const [dialog, setDialog] = useState<DialogPayload | null>(null);

  /** 用户资料里的 vip 字段为 1 表示付费会员 */
  const isVip = Number(user?.vip) === 1;

  const open = (name: string, params?: Record<string, any>) => onOpen?.(name, params);

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

  /**
   * 生词本学习目标：生词本词库设置的「每日添加新学习卡片数量」，
   * 存于 pack.conf.pack_btns_setting.day_limit（服务端字段，非本地设置）。
   */
  const [dayLimit, setDayLimit] = useState(0);
  const [loadingDayLimit, setLoadingDayLimit] = useState(true);
  /**
   * 学习目标保存走乐观更新：点了立刻选中，请求后台跑。
   * dayLimitReqRef 记请求序号，保证只有最后一次点击的结果落到界面；
   * dayLimitSavingRef 标记是否有请求在飞，飞行期间跳过焦点刷新。
   */
  const dayLimitReqRef = useRef(0);
  const dayLimitSavingRef = useRef(false);
  /** 自定义输入框里的值；服务端值不在快捷档位里时回填到这里 */
  const [customLimit, setCustomLimit] = useState('');

  const loadDayLimit = useCallback(async () => {
    setLoadingDayLimit(true);
    try {
      const limit = await fetchNotebookDayLimit();
      setDayLimit(limit);
    } catch {
      // 取不到（未登录或网络问题）时保持 0，卡片仍可点，点了会提示
      setDayLimit(0);
    } finally {
      setLoadingDayLimit(false);
    }
  }, []);

  /** 进页面 / 登录态变化时读取生词本每日学习目标 */
  useEffect(() => {
    loadDayLimit();
  }, [isLoggedIn, loadDayLimit]);

  /**
   * 切换生词本学习目标：整包回传词库，只改 day_limit，其它字段不动。
   * 乐观更新：点击后立刻把选中态落到 UI，不等接口返回；失败则回滚并提示。
   */
  const handleDayLimitChange = async (goal: number) => {
    if (dayLimit === goal) return;
    const prevLimit = dayLimit;
    const req = ++dayLimitReqRef.current;
    const isLatest = () => req === dayLimitReqRef.current;

    setDayLimit(goal); // ① 立刻给焦点反馈，不等网络
    dayLimitSavingRef.current = true;
    try {
      const saved = await saveNotebookDayLimit(goal);
      if (isLatest()) setDayLimit(saved);
    } catch (e: any) {
      if (isLatest()) setDayLimit(prevLimit);
      setDialog({
        title: '设置失败',
        message: e?.message || '生词本学习目标保存失败，请稍后重试',
        confirmText: '知道了',
        showCancel: false,
        onConfirm: () => setDialog(null),
      });
    } finally {
      if (isLatest()) dayLimitSavingRef.current = false;
    }
  };

  /** 当前目标不在快捷档位里时，说明是自定义值（可能是别处设置的） */
  const isCustomLimit = dayLimit > 0 && !NOTEBOOK_DAY_LIMIT_OPTIONS.includes(dayLimit);

  /** 自定义值回填：不是快捷档位时把服务端的值显示在输入框里 */
  useEffect(() => {
    setCustomLimit(isCustomLimit ? String(dayLimit) : '');
  }, [dayLimit, isCustomLimit]);

  /** 自定义输入提交：空值或非法值不保存，恢复成当前目标 */
  const handleCustomSubmit = async () => {
    const raw = customLimit.trim();
    const n = Number(raw);
    if (!raw || !Number.isFinite(n) || n <= 0) {
      setCustomLimit(isCustomLimit ? String(dayLimit) : '');
      return;
    }
    const goal = Math.min(NOTEBOOK_DAY_LIMIT_MAX, Math.floor(n));
    if (goal === dayLimit) {
      setCustomLimit(String(goal));
      return;
    }
    await handleDayLimitChange(goal);
  };

  const handleAccentChange = (accent: 'en-US' | 'en-GB') => {
    updateSettings({ accent });
  };

  const handleToggleAutoPronounce = (value: boolean) => {
    updateSettings({ autoPronounce: value });
  };

  /** 学习统计：连续打卡 / 已掌握 / 今日学习 / 待复习（真实数据来自 progressStore） */
  const studyStats = [
    { k: '连续打卡', v: String(stats.streakDays), u: '天' },
    { k: '已掌握单词', v: String(stats.masteredCount), u: '个' },
    { k: '今日学习', v: String(stats.todayLearnedCount), u: '个' },
    { k: '待复习', v: String(stats.dueTodayCount), u: '个' },
  ];

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

        {/* 学习统计 */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeaderTitle}>学习统计</Text>
          <View style={styles.statsGrid}>
            {studyStats.map((s) => (
              <View key={s.k} style={styles.statBox}>
                <View style={styles.statValueRow}>
                  <Text style={styles.statValue}>{s.v}</Text>
                  <Text style={styles.statUnit}>{s.u}</Text>
                </View>
                <Text style={styles.statLabel}>{s.k}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 生词本学习目标：对应生词本词库设置的「每日添加新学习卡片数量」 */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeaderTitle}>生词本学习目标</Text>
          <Text style={styles.settingDesc}>每天添加到生词本的新学习卡片数量</Text>
          <View style={styles.goalRow}>
            {NOTEBOOK_DAY_LIMIT_OPTIONS.map((goal) => {
              const isSelected = dayLimit === goal;
              return (
                <TouchableOpacity
                  key={goal}
                  style={[styles.goalChip, isSelected && styles.goalChipActive]}
                  onPress={() => handleDayLimitChange(goal)}
                  activeOpacity={0.7}
                  disabled={loadingDayLimit}
                >
                  <Text
                    style={[styles.goalChipText, isSelected && styles.goalChipTextActive]}
                    numberOfLines={1}
                    allowFontScaling={false}
                  >
                    {goal} 词
                  </Text>
                </TouchableOpacity>
              );
            })}
            {/* 自定义：别处可能设成非档位数字，这里原样显示并可直接改 */}
            <TextInput
              style={[styles.goalInput, isCustomLimit && styles.goalInputActive]}
              value={customLimit}
              onChangeText={(t) => setCustomLimit(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="自定义"
              placeholderTextColor={Colors.textMuted}
              maxLength={3}
              returnKeyType="done"
              onSubmitEditing={handleCustomSubmit}
              onBlur={handleCustomSubmit}
              editable={!loadingDayLimit}
            />
          </View>
        </View>

        {/* 发音与朗读 */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeaderTitle}>发音与朗读</Text>

          {/* 口音 */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>口音类型</Text>
            <View style={styles.accentToggle}>
              <TouchableOpacity
                style={[styles.accentOption, progress.accent === 'en-US' && styles.accentOptionActive]}
                onPress={() => handleAccentChange('en-US')}
              >
                <Text
                  style={[styles.accentText, progress.accent === 'en-US' && styles.accentTextActive]}
                >
                  美音 (US)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.accentOption, progress.accent === 'en-GB' && styles.accentOptionActive]}
                onPress={() => handleAccentChange('en-GB')}
              >
                <Text
                  style={[styles.accentText, progress.accent === 'en-GB' && styles.accentTextActive]}
                >
                  英音 (UK)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 自动朗读 */}
          <View style={[styles.settingRow, styles.borderTop]}>
            <View>
              <Text style={styles.settingLabel}>进入新词自动朗读</Text>
              <Text style={styles.settingDesc}>切换卡片时自动播放发音</Text>
            </View>
            <Switch
              value={progress.autoPronounce}
              onValueChange={handleToggleAutoPronounce}
              trackColor={{ false: Colors.divider, true: Colors.blue }}
              thumbColor="#FFFFFF"
            />
          </View>
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

        {/* 关于 */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeaderTitle}>关于</Text>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => open('WebPage', { url: AGREEMENT_URL, title: '用户协议' })}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="document-text-outline" size={20} color={Colors.blue} />
              <Text style={styles.actionLabel}>用户协议</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, styles.borderTop]}
            onPress={() => open('WebPage', { url: POLICY_URL, title: '隐私政策' })}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.blue} />
              <Text style={styles.actionLabel}>隐私政策</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
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

        <View style={styles.aboutFooter}>
          <Text style={styles.aboutText}>糍粑音乐 · CibaMusic v{APP_VERSION}</Text>
          <Text style={styles.aboutSub}>听歌学英语，边听边记单词</Text>
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
  root: { flex: 1, backgroundColor: Colors.bg },
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

  // 卡片通用
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 16,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },

  // 学习统计
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: {
    width: '48%',
    backgroundColor: Colors.surfaceSoft,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValueRow: { flexDirection: 'row', alignItems: 'flex-end' },
  statValue: { fontSize: 24, fontWeight: '800', color: Colors.blue, lineHeight: 28 },
  statUnit: { fontSize: 11, color: Colors.textMuted, marginLeft: 3, marginBottom: 3 },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },

  // 生词本学习目标档位（与「发音与朗读」口音切换同观感）
  goalRow: { flexDirection: 'row', flexWrap: 'nowrap', gap: 8, marginTop: 10 },
  goalChip: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: Colors.divider,
    alignItems: 'center',
  },
  goalChipActive: { backgroundColor: Colors.blue },
  goalChipText: { fontSize: 16, fontWeight: '700', color: Colors.textSub },
  goalChipTextActive: { color: '#FFFFFF' },
  // 固定宽度，避免 TextInput 参与 flex 分配把档位挤扁
  goalInput: {
    width: 96,
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: Colors.divider,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  goalInputActive: {
    backgroundColor: Colors.blueLight,
    borderColor: Colors.blue,
    color: Colors.blue,
  },

  // 发音与朗读
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  borderTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
    marginTop: 8,
    paddingTop: 12,
  },
  settingLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  settingDesc: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  accentToggle: { flexDirection: 'row', backgroundColor: Colors.divider, borderRadius: 8, padding: 3 },
  accentOption: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  accentOptionActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  accentText: { fontSize: 12, fontWeight: '600', color: Colors.textSub },
  accentTextActive: { color: Colors.blue },

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

  // 关于
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  actionLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },

  aboutFooter: { alignItems: 'center', paddingVertical: 20 },
  aboutText: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  aboutSub: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
});
