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
 * 关键坑：MusicSubscription 的订阅状态是异步加载的。在较新的 SDK（Xcode 26 / iOS 26）里，
 * `MusicSubscription.current` 本身是 `async throws` 属性，读取必须 `try await`，且冷启动时
 * 第一次读到的值里 canPlayCatalogContent / canBecomeSubscriber 往往还都是 false。
 * 因此这里用 `try await` 读取并轮询一小段时间（最多 ~1.8s）等它加载完成再判断，
 * 否则会稳定误判成 unknown 导致首页「去订阅」引导条永远不显示。
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
        // MusicSubscription.current 在较新 SDK 上为 async throws，读取需 try await
        var subscription: MusicSubscription
        do {
          subscription = try await MusicSubscription.current
        } catch {
          promise.resolve([
            "status": "unknown",
            "authorizationStatus": "unknown",
            "canPlayCatalogContent": false,
            "canBecomeSubscriber": false,
            "error": error.localizedDescription,
          ])
          return
        }

        // 订阅状态异步加载：轮询等它填充完成，避免冷启动误判 unknown
        for _ in 0..<12 {
          if subscription.canPlayCatalogContent || subscription.canBecomeSubscriber { break }
          try? await Task.sleep(nanoseconds: 150_000_000)
          do {
            subscription = try await MusicSubscription.current
          } catch {
            break
          }
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
