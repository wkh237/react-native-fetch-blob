Pod::Spec.new do |s|
  s.name             = "react-native-fetch-blob"
  s.version          = "0.9.3"
  s.summary          = "A project committed to make file acess and data transfer easier, effiecient for React Native developers."
  s.requires_arc = true
  s.license      = 'MIT'
  s.homepage     = 'n/a'
  s.authors      = { "wkh237" => "xeiyan@gmail.com" }
  s.source       = { :git => "https://github.com/wkh237/react-native-fetch-blob" }
  s.source_files = 'src/ios/**/*.{h,m}'
  s.platform     = :ios, "7.0"
  s.dependency 'React/Core'
end
