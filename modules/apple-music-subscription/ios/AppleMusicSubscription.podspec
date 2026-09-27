Pod::Spec.new do |s|
  s.name           = 'AppleMusicSubscription'
  s.version        = '1.0.0'
  s.summary        = '读取设备上的 Apple Music 订阅状态（MusicKit）'
  s.homepage       = 'https://github.com/sungx-afk/ciba-music'
  s.license        = 'UNLICENSED'
  s.author         = ''
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => 'https://github.com/sungx-afk/ciba-music.git' }
  s.static_framework = true

  # MusicKit 是系统框架，读 MusicSubscription 需要它
  s.frameworks     = 'MusicKit'

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.swift_version = '5.9'
end
