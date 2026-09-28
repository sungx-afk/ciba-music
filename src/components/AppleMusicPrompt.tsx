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
 *
 * 不做右上角关闭：这条引导是转化路径的入口，关掉就少了引导；
 * 宽度上不再自带左右 margin，由父容器统一控制，和下方卡片对齐、更宽。
 *
 * SHOW_DEBUG 打开后会在首页显示原生检测结果，排查真机问题时可临时置为 true。
 */
const SHOW_DEBUG = false;

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
            <Ionicons name="musical-notes" size={17} color={Colors.primary} />
          </View>
          <View style={styles.textBox}>
            <Text style={styles.title}>订阅 Apple Music，听完整版</Text>
            <Text style={styles.sub}>现在播的是试听片段，订阅后解锁全曲与歌词跟读</Text>
          </View>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>去订阅</Text>
            <Ionicons name="chevron-forward" size={12} color="#fff" />
          </View>
        </TouchableOpacity>
      ) : null}
      {debugEl}
    </View>
  );
};

const styles = StyleSheet.create({
  /**
   * 不加左右 margin：父级（首页 ScrollView body）已有 16 的 padding，
   * 这里再给 margin 会比其他卡片窄一圈，所以宽度交给父级统一控制。
   */
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    borderRadius: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  textBox: { flex: 1, marginRight: 10 },
  title: { fontSize: 13.5, fontWeight: '700', color: Colors.text },
  sub: { fontSize: 11, color: Colors.textSub, marginTop: 3, lineHeight: 15 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.primary,
    borderRadius: 9,
    paddingLeft: 12,
    paddingRight: 9,
    paddingVertical: 7,
  },
  ctaText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  debug: { fontSize: 10, color: Colors.textMuted, marginTop: 6, lineHeight: 14 },
});
