export const Colors = {
  primary: '#1B2A4A',
  primaryDeep: '#0E1A33',
  primaryLight: '#EEF3FA',
  primarySoft: '#DCE6F7',
  blue: '#3D7BFF',
  blueDeep: '#2A5FE0',
  blueLight: '#E9F0FF',
  mint: '#1FC8A0',
  mintDeep: '#12A183',
  mintLight: '#E4F8F3',
  gold: '#F5A623',
  goldDeep: '#D9860B',
  goldLight: '#FEF3DC',
  coral: '#E8544A',
  coralLight: '#FDECEA',
  violet: '#8F7FFF',
  violetDeep: '#6A57F0',
  violetLight: '#F0EDFF',
  /** 词汇复习等学习页的靛蓝头部（自上而下的渐变两端） */
  indigo: '#343B79',
  indigoDeep: '#2F297B',
  bg: '#F5F7FB',
  card: '#FFFFFF',
  surfaceSoft: '#F0F4FA',
  paper: '#FBFCFE',
  dark: '#1B2A4A',
  text: '#1B2A4A',
  textSub: '#5A6B85',
  textMuted: '#93A1B5',
  border: '#E3E9F2',
  divider: '#EEF2F8',
  success: '#1FC8A0',
  danger: '#E8544A',
  warning: '#F5A623',
  warningDeep: '#D9860B',
  accent: '#F5A623',
  background: '#F5F7FB',
  backgroundAlt: '#EEF2F8',
  borderStrong: '#C9D4E4',
  darkCard: '#1B2A4A',
  primaryDark: '#0E1A33',
  textPrimary: '#1B2A4A',
  textSecondary: '#5A6B85',
  textTertiary: '#93A1B5',
  pinwheelBlue: '#3D7BFF',
  pinwheelRed: '#E8544A',
  pinwheelGreen: '#1FC8A0',
  pinwheelYellow: '#F5A623',
};

const PINWHEEL = [Colors.pinwheelYellow, Colors.pinwheelGreen, Colors.pinwheelBlue, Colors.pinwheelRed];

export function getCategoryColor(name: string): string {
  if (!name) return Colors.primary;
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return PINWHEEL[sum % PINWHEEL.length];
}
