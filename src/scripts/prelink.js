var fs = require('fs');
var MANIFEST_PATH = process.cwd() + '/android/app/src/main/AndroidManifest.xml';

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
