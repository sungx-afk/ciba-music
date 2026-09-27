import ExpoModulesCore
import MusicKit
import Foundation

/**
 * 用 MusicKit 的 ApplicationMusicPlayer 播放 Apple Music 全曲。
 *
 * 流程：按 catalog id 取 Song → 设为队列 → play()，再用定时器把播放进度推给 JS。
 *
 * 前提：
 *   - Info.plist（app.json → ios.infoPlist）有 NSAppleMusicUsageDescription
 *   - App ID 勾选了 MusicKit 服务（自动 developer token）
 *   - 用户已订阅 Apple Music（canPlayCatalogContent = true）
 *
 * 注意：MusicKit 的 API 声明在不同 SDK 版本上有过变化（如 MusicSubscription.current 变成
 * async throws、MusicAuthorization.current 被移除），本文件尽量只用稳定 API 并做兜底。
 */
public final class AppleMusicPlayerModule: Module {
  /// 当前歌曲时长（秒），由 playSong 写入
  private var currentDuration: Double = 0
  /// 播放状态轮询
  private var pollTimer: Timer?
  /// 上一次播放状态，用于识别「自然播完」
  private var lastStatus: String = "stopped"

  public func definition() -> ModuleDefinition {
    Name("AppleMusicPlayer")

    Events("onPlaybackStatus")

    AsyncFunction("playSong") { (appleMusicId: String, promise: Promise) in
      guard #available(iOS 15.0, *) else {
        promise.reject("unsupported", "Apple Music 全曲播放需要 iOS 15+")
        return
      }
      Task { @MainActor in
        do {
          let request = MusicCatalogResourceRequest<Song>(
            matching: \.id,
            equalTo: MusicItemID(appleMusicId)
          )
          let response = try await request.response()
          guard let song = response.items.first else {
            promise.reject("song_not_found", "Apple Music 找不到这首歌：\(appleMusicId)")
            return
          }
          let player = ApplicationMusicPlayer.shared
          player.queue = ApplicationMusicPlayer.Queue(for: [song])
          self.currentDuration = song.duration ?? 0
          try await player.play()
          self.lastStatus = "playing"
          self.startPolling()
          promise.resolve(["duration": self.currentDuration])
        } catch {
          promise.reject("play_failed", error.localizedDescription)
        }
      }
    }

    AsyncFunction("resume") { (promise: Promise) in
      guard #available(iOS 15.0, *) else {
        promise.resolve()
        return
      }
      Task { @MainActor in
        do {
          try await ApplicationMusicPlayer.shared.play()
          self.lastStatus = "playing"
          self.startPolling()
          promise.resolve()
        } catch {
          promise.reject("resume_failed", error.localizedDescription)
        }
      }
    }

    AsyncFunction("pause") { (promise: Promise) in
      guard #available(iOS 15.0, *) else {
        promise.resolve()
        return
      }
      ApplicationMusicPlayer.shared.pause()
      self.lastStatus = "paused"
      promise.resolve()
    }

    AsyncFunction("seek") { (seconds: Double, promise: Promise) in
      guard #available(iOS 15.0, *) else {
        promise.resolve()
        return
      }
      Task { @MainActor in
        do {
          try await ApplicationMusicPlayer.shared.seek(to: seconds)
          promise.resolve()
        } catch {
          promise.reject("seek_failed", error.localizedDescription)
        }
      }
    }

    AsyncFunction("stop") { (promise: Promise) in
      guard #available(iOS 15.0, *) else {
        promise.resolve()
        return
      }
      ApplicationMusicPlayer.shared.stop()
      self.lastStatus = "stopped"
      self.stopPolling()
      promise.resolve()
    }

    OnDestroy {
      self.stopPolling()
    }
  }

  @MainActor
  private func startPolling() {
    if pollTimer != nil { return }
    let timer = Timer(timeInterval: 0.4, repeats: true) { [weak self] _ in
      Task { @MainActor in self?.emitStatus() }
    }
    RunLoop.main.add(timer, forMode: .common)
    pollTimer = timer
  }

  private func stopPolling() {
    pollTimer?.invalidate()
    pollTimer = nil
  }

  @MainActor
  private func emitStatus() {
    guard #available(iOS 15.0, *) else { return }
    let player = ApplicationMusicPlayer.shared
    let status = describePlaybackStatus(player.state.playbackStatus)
    var payload: [String: Any?] = [
      "status": status,
      "position": player.playbackTime,
      "duration": currentDuration,
    ]
    // playing -> stopped 视为自然播完（手动 stop 时 lastStatus 不是 playing）
    if lastStatus == "playing" && status == "stopped" {
      payload["finished"] = true
      stopPolling()
    }
    lastStatus = status
    sendEvent("onPlaybackStatus", payload)
  }
}

@available(iOS 15.0, *)
private func describePlaybackStatus(_ status: MusicPlayer.PlaybackStatus) -> String {
  switch status {
  case .playing: return "playing"
  case .paused: return "paused"
  case .stopped: return "stopped"
  case .interrupted: return "interrupted"
  case .seekingForward, .seekingBackward: return "playing"
  @unknown default: return "unknown"
  }
}
