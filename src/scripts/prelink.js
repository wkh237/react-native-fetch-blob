var fs = require('fs');
var MANIFEST_PATH = process.cwd() + '/android/app/src/main/AndroidManifest.xml';

fs.readFile(MANIFEST_PATH, function(err, data) {

  if(err)
    console.log('failed to locate AndroidManifest.xml file, you may have to add file access permission manually.');
  else {

    data = String(data).replace(
      '<uses-permission android:name="android.permission.INTERNET" />',
      '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" /> '
    )
    fs.writeFileSync(MANIFEST_PATH, data);

  }

})
