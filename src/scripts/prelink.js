var fs = require('fs');

var MANIFEST_PATH = process.cwd() + '/android/app/src/main/AndroidManifest.xml';
var PACKAGE_JSON = process.cwd() + '/package.json';

var hasNecessaryFile = fs.existsSync(MANIFEST_PATH) && fs.existsSync(MANIFEST_PATH);

if (!hasNecessaryFile) {
  throw 'RNFetchBlob could not found link Android automatically, some files could not be found.'
}

var package = fs.readFileSync(PACKAGE_JSON);
var APP_NAME = package.name;
var VERSION = parseFloat(/\d\.\d+(?=\.)/.exec(package.dependencies['react-native']));
var APPLICATION_MAIN = process.cwd() + '/android/app/src/main/java/com/' + APP_NAME.toLocaleLowerCase() + '/MainApplication.java';

if(VERSION >= 0.29) {

  var main = fs.readFileSync(APPLICATION_MAIN);
  main = main.replace('new MainReactPackage()', 'new RNFetchBlobPackage(),\n           new MainReactPackage()');
  fs.writeFileSync(APPLICATION_MAIN, main);

}

// set file access permission for Android < 6.0
fs.readFile(MANIFEST_PATH, function(err, data) {

  if(err)
    console.log('failed to locate AndroidManifest.xml file, you may have to add file access permission manually.');
  else {
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

  }

})
