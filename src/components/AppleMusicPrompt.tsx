import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useAppleMusicSubscription } from '../hooks/useAppleMusicSubscription';
import {
  openAppleMusicSubscribe,
  shouldShowSubscribePrompt,
  APPLE_MUSIC_SUBSCRIBE_URL,
} from '../services/appleMusic';
import { isSubscriptionModuleAvailable } from '../../modules/apple-music-subscription';
import { showToast } from '../utils/toast';

/**
 * 非阻断的订阅引导条。
 * 只要不是「已确认订阅」就一直显示（含未登录 Apple Music 的 unknown 状态）；
 * 未编入原生模块（Expo Go / 安卓）时一律不显示。
 * 右上角 × 只做「本次会话内隐藏」，不做永久关闭。
 *
 * TODO: 调试完成后把 SHOW_DEBUG 关掉（临时在首页显示原生检测结果，便于真机排查）
 */
const SHOW_DEBUG = true;

export const AppleMusicPrompt: React.FC = () => {
  const subscription = useAppleMusicSubscription();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const ok = await shouldShowSubscribePrompt();
      if (!alive) return;
      setVisible(ok);
    })();
    return () => {
      alive = false;
    };
  }, [subscription.status, subscription.updatedAt]);

  const onSubscribe = async () => {
    const opened = await openAppleMusicSubscribe();
    if (!opened) {
      // 兜底：直接给链接，让用户自己复制/打开
      showToast(`请手动打开：${APPLE_MUSIC_SUBSCRIBE_URL}`, 'info');
      void Linking.openURL(APPLE_MUSIC_SUBSCRIBE_URL).catch(() => undefined);
    }
  };

  const onClose = () => {
    // 仅本次会话内隐藏；不做永久关闭，返回/切后台再回来仍会显示
    setVisible(false);
  };

  const debugEl = SHOW_DEBUG ? (
    <Text style={styles.debug} numberOfLines={2}>
      [AM] module={isSubscriptionModuleAvailable() ? 'yes' : 'no'} status={subscription.status} auth=
      {subscription.authorizationStatus} cpc={subscription.canPlayCatalogContent ? 1 : 0} cbs=
      {subscription.canBecomeSubscriber ? 1 : 0}
      {subscription.error ? ` err=${subscription.error}` : ''}
    </Text>
  ) : null;

  return (
    <View>
      {visible ? (
        <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onSubscribe}>
          <View style={styles.iconBox}>
            <Ionicons name="musical-notes" size={16} color={Colors.primary} />
          </View>
          <View style={styles.textBox}>
            <Text style={styles.title}>订阅 Apple Music，听完整版</Text>
            <Text style={styles.sub}>现在播的是试听片段，订阅后解锁全曲与歌词跟读</Text>
          </View>
          <TouchableOpacity style={styles.cta} onPress={onSubscribe} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Text style={styles.ctaText}>去订阅</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.close} onPress={onClose} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Ionicons name="close" size={15} color={Colors.textMuted} />
          </TouchableOpacity>
        </TouchableOpacity>
      ) : null}
      {debugEl}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    borderRadius: 12,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textBox: { flex: 1 },
  title: { fontSize: 13, fontWeight: '700', color: Colors.text },
  sub: { fontSize: 11, color: Colors.textSub, marginTop: 2 },
  cta: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
  },
  ctaText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  close: { padding: 2 },
  debug: { fontSize: 10, color: Colors.textMuted, marginTop: 6, lineHeight: 14 },
});
