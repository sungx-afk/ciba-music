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
 * 这里轮询一小段时间（最多 ~1.8s）等它加载，必要时再请求一次音乐授权兜底。
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
        // 授权状态（只读，不弹系统框）：用于区分「没登录 Apple Music」与「真读不到」
        let authStatusInitial = describeAuth(MusicAuthorization.current.status)

        // 先不弹授权框，轮询等订阅状态加载完成
        var subscription = MusicSubscription.current
        for _ in 0..<12 {
          if subscription.canPlayCatalogContent || subscription.canBecomeSubscriber { break }
          try? await Task.sleep(nanoseconds: 150_000_000)
          subscription = MusicSubscription.current
        }

        // 仍读不到（少数 iOS 版本需要授权后才会加载订阅）：请求一次音乐授权兜底
        var authStatus = authStatusInitial
        if !subscription.canPlayCatalogContent,
          !subscription.canBecomeSubscriber,
          authStatusInitial == "notDetermined" {
          if #available(iOS 15.4, *) {
            do {
              let determined = try await MusicAuthorization.request()
              authStatus = describeAuth(determined)
            } catch {
              // 授权失败不影响本次返回
            }
            for _ in 0..<6 {
              if subscription.canPlayCatalogContent || subscription.canBecomeSubscriber { break }
              try? await Task.sleep(nanoseconds: 150_000_000)
              subscription = MusicSubscription.current
            }
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
          "authorizationStatus": authStatus,
          "canPlayCatalogContent": subscription.canPlayCatalogContent,
          "canBecomeSubscriber": subscription.canBecomeSubscriber,
          "hasCloudLibraryEnabled": subscription.hasCloudLibraryEnabled,
        ])
      }
    }
  }
}

@available(iOS 15.0, *)
private func describeAuth(_ status: MusicAuthorization.Status) -> String {
  switch status {
  case .authorized: return "authorized"
  case .denied: return "denied"
  case .restricted: return "restricted"
  case .notDetermined: return "notDetermined"
  @unknown default: return "unknown"
  }
}
