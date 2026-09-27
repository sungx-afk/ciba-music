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
 * 关键坑：MusicSubscription 的订阅状态是异步加载的。App 冷启动时第一次读
 * `MusicSubscription.current`，`canPlayCatalogContent` / `canBecomeSubscriber` 往往还都是 false，
 * 必须等它填充完成再判断，否则会稳定误判成 `unknown` 导致永远不提示。
 * 这里轮询一小段时间（最多 ~1.8s）等它加载。
 *
 * 注：早期版本曾用 `MusicAuthorization.current` 读取授权状态做区分，但新 SDK（Xcode 26 / iOS 26）
 * 已移除该静态成员，编译会报 “type 'MusicAuthorization' has no member 'current'”。
 * 订阅检测本身不依赖 App 的音乐授权，故此处去掉 MusicAuthorization 相关调用，
 * authorizationStatus 暂恒为 "unknown"（仅为诊断字段，不影响 eligible 判定）。
 *
 * 前置条件：开发者后台给 App ID 勾上 MusicKit App Service（Automatic Developer Token
 * Generation 就靠这个开关，所以这里不需要自己签 developer token）。
 */
public final class AppleMusicSubscriptionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AppleMusicSubscription")

    AsyncFunction("getSubscriptionStatus") { (promise: Promise) in
      guard #available(iOS 15.0, *) else {
        promise.resolve([
          "status": "unknown",
          "authorizationStatus": "unsupported",
          "canPlayCatalogContent": false,
          "canBecomeSubscriber": false,
        ])
        return
      }
      Task { @MainActor in
        // 订阅状态异步加载：轮询等它填充完成，避免冷启动误判 unknown
        var subscription = MusicSubscription.current
        for _ in 0..<12 {
          if subscription.canPlayCatalogContent || subscription.canBecomeSubscriber { break }
          try? await Task.sleep(nanoseconds: 150_000_000)
          subscription = MusicSubscription.current
        }

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
          "authorizationStatus": "unknown",
          "canPlayCatalogContent": subscription.canPlayCatalogContent,
          "canBecomeSubscriber": subscription.canBecomeSubscriber,
          "hasCloudLibraryEnabled": subscription.hasCloudLibraryEnabled,
        ])
      }
    }
  }
}
