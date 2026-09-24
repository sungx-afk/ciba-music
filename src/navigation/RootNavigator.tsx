import React from 'react';
import { AppShell } from './AppShell';

/**
 * 听歌学英语 App 的视图容器：
 * 底部 4 个 Tab（首页 / 我的音乐 / 学习 / 我的）+ 详情练习页栈。
 */
export function RootNavigator() {
  return <AppShell />;
}
