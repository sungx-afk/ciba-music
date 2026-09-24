import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { TabBar } from '../components/TabBar';
import { HomeScreen } from '../screens/HomeScreen';
import { MyMusicScreen } from '../screens/MyMusicScreen';
import { StudyScreen } from '../screens/StudyScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PlayerScreen } from '../screens/PlayerScreen';
import { LyricsScreen } from '../screens/LyricsScreen';
import { VocabScreen } from '../screens/VocabScreen';
import { ListeningScreen } from '../screens/ListeningScreen';
import { ShadowingScreen } from '../screens/ShadowingScreen';
import { AIScreen } from '../screens/AIScreen';

export const AppShell: React.FC = () => {
  const [tab, setTab] = useState('Home');
  const [stack, setStack] = useState<string[]>([]);

  const open = (name: string) => setStack((s) => [...s, name]);
  const back = () => setStack((s) => s.slice(0, -1));
  const current = stack[stack.length - 1];

  const renderDetail = () => {
    switch (current) {
      case 'Player':
        return <PlayerScreen onOpen={open} onBack={back} />;
      case 'Lyrics':
        return <LyricsScreen onBack={back} />;
      case 'Vocab':
        return <VocabScreen onBack={back} />;
      case 'Listening':
        return <ListeningScreen onBack={back} />;
      case 'Shadowing':
        return <ShadowingScreen onBack={back} />;
      case 'AI':
        return <AIScreen onBack={back} />;
      default:
        return null;
    }
  };

  const renderTab = () => {
    if (tab === 'MyMusic') return <MyMusicScreen onOpen={open} />;
    if (tab === 'Study') return <StudyScreen onOpen={open} />;
    if (tab === 'Profile') return <ProfileScreen />;
    return <HomeScreen onOpen={open} />;
  };

  return (
    <View style={styles.root}>
      <View style={styles.page}>{stack.length ? renderDetail() : renderTab()}</View>
      {stack.length ? null : <TabBar active={tab} onChange={setTab} />}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  page: { flex: 1 },
});
