import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    /** 实心主操作样式：给唯一主入口用，默认 false（只显示线性图标） */
    filled?: boolean;
    /** 实心样式下跟在图标后面的文字 */
    label?: string;
  };
}

/**
 * 音乐 App 的顶部栏：深蓝底 + 白字 + 金色点缀，
 * 用来替换糍粑主 App 那套带山水背景的 Header（后者其它移植页还在用，保持不动）。
 * 接口与 Header 一致，页面里只要换 import 就能切换风格。
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightAction,
}) => {
  return (
    <View style={styles.container}>
      {onBack ? (
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}
      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="tail">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightAction ? (
        rightAction.filled ? (
          <TouchableOpacity
            style={styles.filledBtn}
            onPress={rightAction.onPress}
            activeOpacity={0.85}
          >
            <Ionicons name={rightAction.icon} size={18} color="#FFFFFF" />
            {rightAction.label ? <Text style={styles.filledLabel}>{rightAction.label}</Text> : null}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.iconBtn} onPress={rightAction.onPress} activeOpacity={0.7}>
            <Ionicons name={rightAction.icon} size={22} color={Colors.gold} />
          </TouchableOpacity>
        )
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  backBtn: { marginRight: 6, padding: 2 },
  titleWrap: { flex: 1, minWidth: 0 },
  title: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 3 },
  iconBtn: { padding: 6, flexShrink: 0 },
  filledBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: Colors.goldDeep,
    flexShrink: 0,
  },
  filledLabel: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
