import ExpoModulesCore
import MusicKit

/**
 * 只做一件事：把设备上的 Apple Music 订阅状态告诉 JS。
 *
 * 用 MusicKit：
 *   MusicAuthorization.request()        → 请求/确认音乐授权（首次弹一次系统框）
 *   MusicSubscription.current           → 订阅状态（较新 SDK 为 async throws）
 *     canPlayCatalogContent = true  → 已订阅（含试用 / Apple One / 家庭共享成员）
 *     canBecomeSubscriber  = true   → 未订阅且允许 App 展示订阅引导
 *     两者都 false                  → 未知（没登录 Apple Music / 地区不支持 / 模拟器），别提示
 *
 * 关键坑（都在真机上踩过）：
 *   1) 新 SDK 移除了 `MusicAuthorization.current`，改用 `MusicAuthorization.currentStatus`
 *      / `MusicAuthorization.request()`；直接写 `.current` 会编译失败。
 *   2) `MusicSubscription.current` 在新 SDK 是 `async throws`，读取必须 `try await`。
 *   3) 不先拿授权就读订阅，会抛「权限被拒绝」；而 Info.plist 缺
 *      `NSAppleMusicUsageDescription` 时系统连授权框都不弹，直接拒绝。
 *
 * 前置条件：
 *   - Info.plist（app.json → ios.infoPlist）必须有 NSAppleMusicUsageDescription
 *   - 开发者后台给 App ID（com.yugusoft.CibaEnglish.music）勾上 MusicKit App Service
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
        // 1) 先确保拿到 Apple Music 授权。
        //    request() 仅在用户从未选择过时弹一次系统框，之后直接返回既有状态；
        //    用 try? 兜底：签名在不同 SDK 上可能是 async 或 async throws，两种都能编过。
        var authDescription = "unknown"
        if let auth = try? await MusicAuthorization.request() {
          authDescription = String(describing: auth)
        }

        // 2) 读订阅状态（新 SDK 为 async throws）
        var subscription: MusicSubscription
        do {
          subscription = try await MusicSubscription.current
        } catch {
          promise.resolve([
            "status": "unknown",
            "authorizationStatus": authDescription,
            "canPlayCatalogContent": false,
            "canBecomeSubscriber": false,
            "error": error.localizedDescription,
          ])
          return
        }

        // 3) 订阅状态异步加载：轮询等它填充完成，避免冷启动误判 unknown
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
          "authorizationStatus": authDescription,
          "canPlayCatalogContent": subscription.canPlayCatalogContent,
          "canBecomeSubscriber": subscription.canBecomeSubscriber,
          "hasCloudLibraryEnabled": subscription.hasCloudLibraryEnabled,
        ])
      }
    }
  }
}
