import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { TabBar } from '../components/TabBar';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { BookmarksScreen } from '../screens/BookmarksScreen';
import { BookmarkStudyScreen } from '../screens/BookmarkStudyScreen';
import { PurchaseScreen } from '../screens/PurchaseScreen';
import { PlayerScreen } from '../screens/PlayerScreen';
import { LyricsScreen } from '../screens/LyricsScreen';
import { VocabScreen } from '../screens/VocabScreen';
import { ListeningScreen } from '../screens/ListeningScreen';
import { ShadowingScreen } from '../screens/ShadowingScreen';
import { AIScreen } from '../screens/AIScreen';
import { CollectionDetailScreen } from '../screens/CollectionDetailScreen';
import { DailyRecommendScreen } from '../screens/DailyRecommendScreen';
import { SearchSongScreen } from '../screens/SearchSongScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ChangePasswordScreen } from '../screens/auth/ChangePasswordScreen';
import { WebPageScreen } from '../screens/WebPageScreen';

/** 详情页入参。目前只有歌单详情页需要（collectionId / 名称 / 封面 / 歌曲数） */
type RouteParams = Record<string, any>;
type StackItem = { name: string; params?: RouteParams };

export const AppShell: React.FC = () => {
  const [tab, setTab] = useState('Home');
  const [stack, setStack] = useState<StackItem[]>([]);

  const open = (name: string, params?: RouteParams) => setStack((s) => [...s, { name, params }]);
  const back = () => setStack((s) => s.slice(0, -1));
  /**
   * 生词本那几个页面是从糍粑主 App 移植来的，内部仍按 react-navigation 的习惯调用
   * navigation.navigate / goBack，这里给它们一个等价的最小适配对象，页面本身不用改。
   */
  const navAdapter = useMemo(
    () => ({
      navigate: (name: string, params?: RouteParams) => open(name, params),
      goBack: back,
    }),
    [],
  );
  /** 清空整条详情栈回到 tab：注册成功等「流程走完」的场景用 */
  const closeAll = () => setStack([]);
  const current = stack[stack.length - 1];

  const renderDetail = () => {
    switch (current?.name) {
      case 'Player':
        return <PlayerScreen params={current.params} onOpen={open} onBack={back} />;
      case 'Lyrics':
        return <LyricsScreen onBack={back} />;
      case 'Vocab':
        return <VocabScreen onBack={back} />;
      case 'BookmarkStudy':
        // 同样是移植页：内部用 route.params 取 rmq 参数
        return (
          <BookmarkStudyScreen route={{ params: current.params }} navigation={navAdapter} />
        );
      case 'Purchase':
        return <PurchaseScreen navigation={navAdapter} />;
      case 'Listening':
        return <ListeningScreen onBack={back} />;
      case 'Shadowing':
        return <ShadowingScreen onBack={back} />;
      case 'AI':
        return <AIScreen onBack={back} />;
      case 'Collection':
        return <CollectionDetailScreen params={current.params} onOpen={open} onBack={back} />;
      case 'DailyRecommend':
        return <DailyRecommendScreen onOpen={open} onBack={back} />;
      case 'SearchSong':
        return <SearchSongScreen params={current.params} onBack={back} />;
      case 'Login':
        return <LoginScreen onBack={back} onOpen={open} />;
      case 'Register':
        return <RegisterScreen onBack={back} onOpen={open} onDone={closeAll} />;
      case 'ForgotPassword':
        return <ForgotPasswordScreen onBack={back} onOpen={open} />;
      case 'ChangePassword':
        return <ChangePasswordScreen onBack={back} onOpen={open} />;
      case 'WebPage':
        // WebPage 是 react-navigation 时代的写法（route.params + navigation.goBack），
        // 这里直接喂一个等价的最小对象，避免为了路由改动这个页面
        return <WebPageScreen route={{ params: current.params }} navigation={{ goBack: back }} />;
      default:
        return null;
    }
  };

  const renderTab = () => {
    if (tab === 'Bookmarks') return <BookmarksScreen navigation={navAdapter} />;
    if (tab === 'Profile') return <ProfileScreen onOpen={open} />;
    return <HomeScreen onOpen={open} onSwitchTab={setTab} />;
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
