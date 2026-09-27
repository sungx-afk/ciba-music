import ExpoModulesCore
import MusicKit

/**
 * 只做一件事：把设备上的 Apple Music 订阅状态告诉 JS。
 *
 * 用的是 MusicKit 的 `MusicSubscription.current`（iOS 15+）：
 *   canPlayCatalogContent = true  → 已订阅（含试用 / Apple One / 家庭共享成员）
 *   canBecomeSubscriber  = true   → 未订阅且允许 App 展示订阅引导
 *   两者都 false                  → 未知（没登录 Apple Music / 地区不支持 / 模拟器），别提示
 *
 * 前置条件：开发者后台给 App ID 勾上 MusicKit App Service（Automatic Developer Token
 * Generation 就靠这个开关，所以这里不需要自己签 developer token）。
 */
public final class AppleMusicSubscriptionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AppleMusicSubscription")

    AsyncFunction("getSubscriptionStatus") { (promise: Promise) in
      Task {
        if #available(iOS 15.0, *) {
          do {
            let subscription = try await MusicSubscription.current
            let status: String
            if subscription.canPlayCatalogContent {
              status = "subscribed"
            } else if subscription.canBecomeSubscriber {
              status = "eligible"
            } else {
              status = "unknown"
            }
            promise.resolve([
              "status": status,
              "canPlayCatalogContent": subscription.canPlayCatalogContent,
              "canBecomeSubscriber": subscription.canBecomeSubscriber,
              "hasCloudLibraryEnabled": subscription.hasCloudLibraryEnabled,
            ])
          } catch {
            promise.resolve([
              "status": "unknown",
              "canPlayCatalogContent": false,
              "canBecomeSubscriber": false,
              "error": error.localizedDescription,
            ])
          }
        } else {
          promise.resolve([
            "status": "unknown",
            "canPlayCatalogContent": false,
            "canBecomeSubscriber": false,
          ])
        }
      }
    }
  }
}
