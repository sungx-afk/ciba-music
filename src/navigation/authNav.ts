/**
 * 登录相关页面统一的导航出口。
 *
 * ciba-music 用的是自带的 AppShell 栈（首页 / 我的音乐 / 学习 / 我的 + 详情栈），
 * 不是 react-navigation，所以从 ciba-episode 迁过来的账号页面统一改拿这几个回调，
 * 由 AppShell 负责把它们接到真实的栈操作上。
 */
export interface AuthNavProps {
  /** 关闭当前页（返回上一页） */
  onBack: () => void;
  /** 打开下一个页面，如 WebPage / Login / Register / ForgotPassword */
  onOpen: (name: string, params?: Record<string, any>) => void;
  /**
   * 流程走完要回到主页（清空整条详情栈）。
   * 注册成功后用：注册页是压在登录页之上的，只返回一页会停在登录页。
   */
  onDone?: () => void;
}
