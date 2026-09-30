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
 * 注意（踩过的坑）：
 *   - MusicPlayer 在较新 SDK 里是「类」而非协议，且 ApplicationMusicPlayer 继承自它；
 *     不要显式写 `MusicPlayer.PlaybackStatus` 类型名，会 "ambiguous for type lookup"，改成内联 switch。
 *   - 没有 seek(to:) 方法，跳转就是给可写的 playbackTime 赋值。
 */
public final class AppleMusicPlayerModule: Module {
  /// 当前歌曲时长（秒），由 playSong 写入
  private var currentDuration: Double = 0
  /// 播放状态轮询
  private var pollTimer: Timer?
  /// 上一次播放状态，用于识别「自然播完」
  private var lastStatus: String = "stopped"
  /// 自然播完标记，避免一首歌重复触发 finished
  private var finishedFired = false

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
          self.finishedFired = false
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
          self.finishedFired = false
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
      Task { @MainActor in
        ApplicationMusicPlayer.shared.pause()
        self.lastStatus = "paused"
        promise.resolve()
      }
    }

    AsyncFunction("seek") { (seconds: Double, promise: Promise) in
      guard #available(iOS 15.0, *) else {
        promise.resolve()
        return
      }
      Task { @MainActor in
        // MusicKit 没有 seek(to:)，跳转就是给可写的 playbackTime 赋值
        ApplicationMusicPlayer.shared.playbackTime = max(0, seconds)
        promise.resolve()
      }
    }

    AsyncFunction("stop") { (promise: Promise) in
      guard #available(iOS 15.0, *) else {
        promise.resolve()
        return
      }
      Task { @MainActor in
        ApplicationMusicPlayer.shared.stop()
        self.lastStatus = "stopped"
        self.stopPolling()
        promise.resolve()
      }
    }

    /**
     * 在 Apple Music 目录里按关键词搜索歌曲（方案：搜索接入）。
     * 复用 App 已开启的 MusicKit Automatic Developer Token，无需自建 JWT。
     * 前提：用户已授权 MusicKit（canPlayCatalogContent 不一定是 true，catalog 搜索只要 .authorized）。
     */
    AsyncFunction("search") { (term: String, limit: Int, promise: Promise) in
      guard #available(iOS 15.0, *) else {
        promise.reject("unsupported", "Apple Music 搜索需要 iOS 15+")
        return
      }
      Task { @MainActor in
        do {
          // catalog 搜索依赖用户授权（订阅模块已触发过，这里兜底再确认一次）。
          // request() 直接返回 MusicAuthorization.Status，用返回值判断授权状态。
          let authStatus = await MusicAuthorization.request()
          guard authStatus == .authorized else {
            promise.reject("not_authorized", "需要授权访问 Apple Music 才能搜索")
            return
          }
          let request = MusicCatalogSearchRequest(term: term, types: [Song.self])
          let response = try await request.response()
          let songs = response.songs.prefix(max(1, limit))
          let items: [[String: Any]] = songs.map { song in
            var dict: [String: Any] = [:]
            dict["id"] = song.id.rawValue
            dict["title"] = song.title
            dict["artist"] = song.artistName
            dict["album"] = song.albumTitle ?? ""
            dict["duration"] = song.duration ?? 0
            if let artwork = song.artwork {
              dict["artworkUrl"] = artwork.url(width: 300, height: 300)?.absoluteString ?? ""
            }
            if let preview = song.previewAssets?.first {
              dict["previewUrl"] = preview.url?.absoluteString ?? ""
            }
            return dict
          }
          promise.resolve(items)
        } catch {
          promise.reject("search_failed", error.localizedDescription)
        }
      }
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
    // 内联 switch：不再显式引用 MusicPlayer 类型，避免 ambiguous type lookup
    let status: String
    switch player.state.playbackStatus {
    case .playing: status = "playing"
    case .paused: status = "paused"
    case .stopped: status = "stopped"
    case .interrupted: status = "interrupted"
    case .seekingForward, .seekingBackward: status = "playing"
    @unknown default: status = "unknown"
    }
    let time = player.playbackTime
    var payload: [String: Any?] = [
      "status": status,
      "position": time.isNaN ? 0 : time,
      "duration": currentDuration,
    ]
    // 自然播完识别：
    // ① 常规情况 playing -> stopped（手动 stop 时 lastStatus 已是 stopped，不会误触发）；
    // ② 个别 iOS 版本 MusicKit 在末尾不把状态切到 stopped（仍停在 playing 但进度已到头），
    //    用「进度到末尾」兜底，避免真机全曲放完不切下一首。
    if !finishedFired,
       lastStatus == "playing",
       (status == "stopped" || (status == "playing" && currentDuration > 0 && time >= currentDuration - 0.8)) {
      finishedFired = true
      payload["finished"] = true
      stopPolling()
    }
    lastStatus = status
    sendEvent("onPlaybackStatus", payload)
  }
}
