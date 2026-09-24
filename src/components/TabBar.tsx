import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

export const TAB_ITEMS = [
  { key: 'Home', label: '首页', icon: 'home-outline', iconOn: 'home' },
  { key: 'MyMusic', label: '我的音乐', icon: 'musical-notes-outline', iconOn: 'musical-notes' },
  { key: 'Study', label: '学习', icon: 'book-outline', iconOn: 'book' },
  { key: 'Profile', label: '我的', icon: 'person-outline', iconOn: 'person' },
];

type Props = { active: string; onChange: (key: string) => void };

export const TabBar: React.FC<Props> = ({ active, onChange }) => {
  return (
    <View style={styles.bar}>
      {TAB_ITEMS.map((it) => {
        const on = it.key === active;
        return (
          <TouchableOpacity key={it.key} style={styles.item} onPress={() => onChange(it.key)}>
            <Ionicons name={(on ? it.iconOn : it.icon) as any} size={22} color={on ? Colors.blue : Colors.textMuted} />
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
    paddingBottom: 8,
    paddingTop: 6,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  labelOn: { color: Colors.blue, fontWeight: '600' },
});
