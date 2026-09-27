import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';

export const TAB_ITEMS = [
  { key: 'Home', label: '首页', icon: 'home-outline', iconOn: 'home' },
  { key: 'Bookmarks', label: '生词本', icon: 'bookmark-outline', iconOn: 'bookmark' },
  { key: 'Profile', label: '我的', icon: 'person-outline', iconOn: 'person' },
];

type Props = { active: string; onChange: (key: string) => void };

export const TabBar: React.FC<Props> = ({ active, onChange }) => {
  /** 真机底部有 Home Indicator，不留出这一段高度会把「首页/生词本/我的」压在横条下面点不到 */
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TAB_ITEMS.map((it) => {
        const on = it.key === active;
        return (
          <TouchableOpacity key={it.key} style={styles.item} onPress={() => onChange(it.key)}>
            <Ionicons
              name={(on ? it.iconOn : it.icon) as any}
              size={22}
              color={on ? Colors.gold : Colors.textMuted}
            />
            <Text style={[styles.label, on && styles.labelOn]}>{it.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 6,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  labelOn: { color: Colors.goldDeep, fontWeight: '600' },
});
