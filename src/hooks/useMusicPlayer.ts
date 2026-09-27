import { useEffect, useState } from 'react';
import { musicPlayer } from '../services/player/musicPlayer';
import { PlayerState } from '../services/player/types';

/** 订阅播放器状态；页面不要自己管 expo-av / MusicKit */
export function useMusicPlayer(): PlayerState {
  const [state, setState] = useState<PlayerState>(() => musicPlayer.getState());
  useEffect(() => musicPlayer.subscribe(setState), []);
  return state;
}
