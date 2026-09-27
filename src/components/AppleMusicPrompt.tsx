import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useAppleMusicSubscription } from '../hooks/useAppleMusicSubscription';
import {
  dismissSubscribePrompt,
  markSubscribePromptShown,
  openAppleMusicSubscribe,
  shouldShowSubscribePrompt,
  APPLE_MUSIC_SUBSCRIBE_URL,
} from '../services/appleMusic';
import { showToast } from '../utils/toast';

/**
 * 非阻断的订阅引导条。
 * 只在「确认未订阅」时才可能露出来，且最多两次、可永久关闭；
 * 未知状态（安卓 / Expo Go / 没登录 Apple Music / 模拟器）一律不显示。
 */
export const AppleMusicPrompt: React.FC = () => {
  const subscription = useAppleMusicSubscription();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const ok = await shouldShowSubscribePrompt();
      if (!alive) return;
      setVisible(ok);
      if (ok) await markSubscribePromptShown();
    })();
    return () => {
      alive = false;
    };
  }, [subscription.status, subscription.updatedAt]);

  if (!visible) return null;

  const onSubscribe = async () => {
    const opened = await openAppleMusicSubscribe();
    if (!opened) {
      // 兜底：直接给链接，让用户自己复制/打开
      showToast(`请手动打开：${APPLE_MUSIC_SUBSCRIBE_URL}`, 'info');
      void Linking.openURL(APPLE_MUSIC_SUBSCRIBE_URL).catch(() => undefined);
    }
  };

  const onClose = async () => {
    setVisible(false);
    await dismissSubscribePrompt();
  };

  return (
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
});
