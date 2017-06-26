Pod::Spec.new do |s|
  s.name             = "react-native-fetch-blob"
  s.version          = "0.10.6"
  s.summary          = "A project committed to make file acess and data transfer easier, effiecient for React Native developers."
  s.requires_arc = true
  s.license      = 'MIT'
  s.homepage     = 'n/a'
  s.authors      = { "wkh237" => "xeiyan@gmail.com" }
  s.source       = { :git => "https://github.com/wkh237/react-native-fetch-blob", :tag => 'v0.10.6'}
  s.source_files = 'ios/**/*.{h,m}'
  s.platform     = :ios, "7.0"
  s.dependency 'React/Core'
end
