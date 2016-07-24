var fs = require('fs');

var MANIFEST_PATH = process.cwd() + '/android/app/src/main/AndroidManifest.xml';
var PACKAGE_JSON = process.cwd() + '/package.json';

var hasNecessaryFile = fs.existsSync(MANIFEST_PATH) && fs.existsSync(MANIFEST_PATH);

if (!hasNecessaryFile) {
  throw 'RNFetchBlob could not found link Android automatically, some files could not be found.'
}

var package = JSON.parse(fs.readFileSync(PACKAGE_JSON));
var APP_NAME = package.name;
var APPLICATION_MAIN = process.cwd() + '/android/app/src/main/java/com/' + APP_NAME.toLocaleLowerCase() + '/MainApplication.java';
var PACKAGE_GRADLE = process.cwd() + '/node_modules/react-native-fetch-blob/android/build.gradle'

var VERSION = checkVersion();
console.log('RNFetchBlob detected app version .. ' + VERSION);

if(VERSION >= 0.29) {
  console.log('RNFetchBlob patching MainApplication.java .. ');
  if(!fs.existsSync(APPLICATION_MAIN)) {
    throw 'RNFetchBlob could not link Android automatically, MainApplication.java not found in path : ' + APPLICATION_MAIN
  }
  var main = fs.readFileSync(APPLICATION_MAIN);
  if(String(main).match('new RNFetchBlobPackage()') !== null) {
    console.log('skipped');
    return
  }
  main = String(main).replace('new MainReactPackage()', 'new RNFetchBlobPackage(),\n           new MainReactPackage()');
  main = String(main).replace('import com.facebook.react.ReactApplication;', 'import com.facebook.react.ReactApplication;\nimport com.RNFetchBlob.RNFetchBlobPackage;')

  fs.writeFileSync(APPLICATION_MAIN, main);
  console.log('RNFetchBlob patching MainApplication.java .. ok')

}

if(VERSION < 0.28) {
  // console.log('You project version is '+ VERSION + 'which does not meet requirement of react-native-fetch-blob 7.0+, please upgrade your application template to react-native 0.27+, otherwise Android application will not working.')
  // add OkHttp3 dependency fo 0.28- project
  var main = fs.readFileSync(PACKAGE_GRADLE);
  console.log('adding OkHttp3 dependency to pre 0.28 project .. ')
  main = String(main).replace('//{RNFetchBlob_PRE_0.28_DEPDENDENCY}', "compile 'com.squareup.okhttp3:okhttp:3.4.1'");
  fs.writeFileSync(PACKAGE_GRADLE, main);
  console.log('adding OkHttp3 dependency to pre 0.28 project .. ok')
}

// set file access permission for Android < 6.0
fs.readFile(MANIFEST_PATH, function(err, data) {

  if(err)
    console.log('failed to locate AndroidManifest.xml file, you may have to add file access permission manually.');
  else {

    console.log('RNFetchBlob patching AndroidManifest.xml .. ');
    // append fs permission
    data = String(data).replace(
      '<uses-permission android:name="android.permission.INTERNET" />',
      '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" /> '
    )
    // append DOWNLOAD_COMPLETE intent permission
    data = String(data).replace(
      '<category android:name="android.intent.category.LAUNCHER" />',
      '<category android:name="android.intent.category.LAUNCHER" />\n     <action android:name="android.intent.action.DOWNLOAD_COMPLETE"/>'
    )
    fs.writeFileSync(MANIFEST_PATH, data);
    console.log('RNFetchBlob patching AndroidManifest.xml .. ok');

  }

})

function checkVersion() {
  console.log('RNFetchBlob checking app version ..');
  return parseFloat(/\d\.\d+(?=\.)/.exec(package.dependencies['react-native']));
}
