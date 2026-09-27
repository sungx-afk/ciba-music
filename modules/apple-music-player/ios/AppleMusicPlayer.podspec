Pod::Spec.new do |s|
  s.name           = 'AppleMusicPlayer'
  s.version        = '1.0.0'
  s.summary        = '用 MusicKit ApplicationMusicPlayer 播放 Apple Music 全曲'
  s.homepage       = 'https://github.com/sungx-afk/ciba-music'
  s.license        = 'UNLICENSED'
  s.author         = ''
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => 'https://github.com/sungx-afk/ciba-music.git' }
  s.static_framework = true

  # MusicKit 是系统框架，全曲播放需要它
  s.frameworks     = 'MusicKit'

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.swift_version = '5.9'
end
