# react-native-fetch-blob [![release](https://img.shields.io/github/release/wkh237/react-native-fetch-blob.svg?maxAge=86400&style=flat-square)](https://www.npmjs.com/package/react-native-fetch-blob) [![npm](https://img.shields.io/npm/v/react-native-fetch-blob.svg?style=flat-square)](https://www.npmjs.com/package/react-native-fetch-blob) ![](https://img.shields.io/badge/PR-Welcome-brightgreen.svg?style=flat-square) [![npm](https://img.shields.io/npm/l/express.svg?maxAge=2592000&style=flat-square)]() [![npm](https://img.shields.io/badge/inProgress-0.7.0-yellow.svg?style=flat-square)](https://github.com/wkh237/react-native-fetch-blob/milestones)

A module provides upload, download, and files access API. Supports file stream read/write for process large files.

## TOC
* [Rationale](#user-content-rationale)
* [Backward Compatible](#user-content-backward-compatible)
* [Installation](#user-content-installation)
* [Recipes](#user-content-recipes)
 * [Download file](#user-content-download-example--fetch-files-that-needs-authorization-token)
 * [Upload file](#user-content-upload-example--dropbox-files-upload-api)
 * [Multipart/form upload](#user-content-multipartform-data-example--post-form-data-with-file-and-data)
 * [Upload/Download progress](#user-content-uploaddownload-progress)
 * [Android Media Scanner, and Download Manager Support](#user-content-android-media-scanner-and-download-manager-support)
 * [File access](#user-content-file-access)
 * [File stream](#user-content-file-stream)
 * [Manage cached files](#user-content-cache-file-management)
 * [Self-Signed SSL Server](#user-content-self-signed-ssl-server)
* [API References](https://github.com/wkh237/react-native-fetch-blob/wiki/Fetch-API)
* [Development](#user-content-development)
 
## Rationale

React Native does not support `Blob` object at this moment, which means if you're going to send/receive binary data via `fetch` API, that might not work as you expect. See [facebook/react-native#854](https://github.com/facebook/react-native/issues/854).

For some use cases, you might get into trouble. For example, displaying an image that requires a specific field in headers (ex. "Authorization : Bearer ...") or body, so you can't just pass the image uri to `Image` component because that will probably returns a 401 response. Or you're going to upload binary data which generated from JS, the server will get an empry body due to [this issue](https://github.com/facebook/react-native/issues/854). With help of APIs provided by this module, you can send HTTP request with any headers, and decide how to handle the response/reqeust data without worry about if it is not supported by `fetch` API. The response data can be just simply converted into BASE64 string, or stored to a file directly so that you can read it by using file access APIs such as readFile, readStream.

This module was designed to be a substitution of `Blob`, there's a set of APIs including basic file system CRUD method, and file stream reader/writer. Also it has a special `fetch` implementation that supports binary request/response body.

## Backward Compatible

All updates are `backward-compatible` generally you don't have to change existing code unless you're going to use new APIs. But we recommend pre `0.5.0` users consider upgrade the package to latest version, since we have introduced new APIs can either `upload` or `download` files simply using a file path. It's much more memory efficent in some use case. We've also introduced `fs` APIs for access files, and `file stream` API that helps you read/write files (especially for **large ones**), see [Examples](#user-content-recipes) bellow. This module implements native methods, supports both Android (uses awesome native library  [AsyncHttpClient](https://github.com/AsyncHttpClient/async-http-client])) and IOS.

## Installation

Install package from npm

```sh
npm install --save react-native-fetch-blob
```

Link package using [rnpm](https://github.com/rnpm/rnpm)

```sh
rnpm link
```

### For React Native >= 0.29.0 (Android)

> If you're using react-native >= `0.29.0`, the package might not be able to link through `rnpm link`, and you might see an error screen similar to [#51](https://github.com/wkh237/react-native-fetch-blob/issues/51), this is because a [a bug in 0.29.0](https://github.com/facebook/react-native/commit/4dabb575b1b311ba541fae7eabbd49f08b5391b3), someone has already fixed it, but the solution does not work on our project, you may have to manually add the package yourself.

Add this code to `MainApplication.java`

```diff
...
+ import com.RNFetchBlob.RNFetchBlobPackage;                                                                                 
...
protected List<ReactPackage> getPackages() {
      return Arrays.<ReactPackage>asList(
          new MainReactPackage(),
+          new RNFetchBlobPackage()                                                                                         
      );
    }
  };
...
```

**Grant Permission to External storage for Android 5.0 or lower**

Mechanism about granting Android permissions has slightly different since Android 6.0 released, please refer to [Official Document](https://developer.android.com/training/permissions/requesting.html).

If you're going to access external storage (say, SD card storage) for `Android 5.0` (or lower) devices, you might have to add the following line to `AndroidManifest.xml`.

```diff
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.rnfetchblobtest"
    android:versionCode="1"
    android:versionName="1.0">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
+   <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />                                               
+   <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />                                              

    ...

```

Also, if you're going to use `Android Download Manager` you have to add this to `AndroidManifetst.xml`

```diff
    <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
+           <action android:name="android.intent.action.DOWNLOAD_COMPLETE"/>                          
    </intent-filter>
```

**Grant Access Permission for Android 6.0**

Beginning in Android 6.0 (API level 23), users grant permissions to apps while the app is running, not when they install the app. So adding permissions in `AndroidManifest.xml` won't work in Android 6.0 devices. To grant permissions in runtime, you might use modules like [react-native-android-permissions](https://github.com/lucasferreira/react-native-android-permissions).

## Recipes

```js
import RNFetchBlob from 'react-native-fetch-blob'
```
#### Download example : Fetch files that needs authorization token

```js

// send http request in a new thread (using native code)
RNFetchBlob.fetch('GET', 'http://www.example.com/images/img1.png', {
    Authorization : 'Bearer access-token...',
    // more headers  ..
  })
  // when response status code is 200
  .then((res) => {
    // the conversion is done in native code
    let base64Str = res.base64()
    // the following conversions are done in js, it's SYNC
    let text = res.text()
    let json = res.json()

  })
  // Status code is not 200
  .catch((errorMessage, statusCode) => {
    // error handling
  })
```

#### Download to storage directly

The simplest way is give a `fileCache` option to config, and set it to `true`. This will let the incoming response data stored in a temporary path **without** any file extension.

**These files won't be removed automatically, please refer to [Cache File Management](#user-content-cache-file-management)**

```js
RNFetchBlob
  .config({
    // add this option that makes response data to be stored as a file,
    // this is much more performant.
    fileCache : true,
  })
  .fetch('GET', 'http://www.example.com/file/example.zip', {
    some headers ..
  })
  .then((res) => {
    // the temp file path
    console.log('The file saved to ', res.path())
  })
```

**Set Temp File Extension**

Sometimes you might need a file extension for some reason. For instance, when using file path as source of `Image` component, the path should end with something like .png or .jpg, you can do this by add `appendExt` option to `config`.

```js
RNFetchBlob
  .config({
    fileCache : true,
    // by adding this option, the temp files will have a file extension
    appendExt : 'png'
  })
  .fetch('GET', 'http://www.example.com/file/example.zip', {
    some headers ..
  })
  .then((res) => {
    // the temp file path with file extension `png`
    console.log('The file saved to ', res.path())
    // Beware that when using a file path as Image source on Android,
    // you must prepend "file://"" before the file path
    imageView = <Image source={{ uri : Platform.OS === 'android' ? 'file://' + res.path()  : '' + res.path() }}/>
  })
```

**Use Specific File Path**

If you prefer a specific path rather than random generated one, you can use `path` option. We've added a constant [dirs](#user-content-dirs) in v0.5.0 that contains several common used directories.

```js
let dirs = RNFetchBlob.fs.dirs
RNFetchBlob
.config({
  // response data will be saved to this path if it has access right.
  path : dirs.DocumentDir + '/path-to-file.anything'
})
.fetch('GET', 'http://www.example.com/file/example.zip', {
  //some headers ..
})
.then((res) => {
  // the path should be dirs.DocumentDir + 'path-to-file.anything'
  console.log('The file saved to ', res.path())
})
```

**These files won't be removed automatically, please refer to [Cache File Management](#user-content-cache-file-management)**

####  Upload example : Dropbox [files-upload](https://www.dropbox.com/developers/documentation/http/documentation#files-upload) API

`react-native-fetch-blob` will convert the base64 string in `body` to binary format using native API, this process will be  done in a new thread, so it's async.

```js

RNFetchBlob.fetch('POST', 'https://content.dropboxapi.com/2/files/upload', {
    Authorization : "Bearer access-token...",
    'Dropbox-API-Arg': JSON.stringify({
      path : '/img-from-react-native.png',
      mode : 'add',
      autorename : true,
      mute : false
    }),
    'Content-Type' : 'application/octet-stream',
    // here's the body you're going to send, should be a BASE64 encoded string
    // (you can use "base64" APIs to make one).
    // The data will be converted to "byte array"(say, blob) before request sent.  
  }, base64ImageString)
  .then((res) => {
    console.log(res.text())
  })
  .catch((err) => {
    // error handling ..
  })
```

#### Upload a file from storage

If you're going to use a `file` request body, just wrap the path with `wrap` API.

```js
RNFetchBlob.fetch('POST', 'https://content.dropboxapi.com/2/files/upload', {
    // dropbox upload headers
    Authorization : "Bearer access-token...",
    'Dropbox-API-Arg': JSON.stringify({
      path : '/img-from-react-native.png',
      mode : 'add',
      autorename : true,
      mute : false
    }),
    'Content-Type' : 'application/octet-stream',
    // Change BASE64 encoded data to a file path with prefix `RNFetchBlob-file://`.
    // Or simply wrap the file path with RNFetchBlob.wrap().
  }, RNFetchBlob.wrap(PATH_TO_THE_FILE))
  .then((res) => {
    console.log(res.text())
  })
  .catch((err) => {
    // error handling ..
  })
```

#### Multipart/form-data example : Post form data with file and data

In `version >= 0.3.0` you can also post files with form data, just put an array in `body`, with elements have property `name`, `data`, and `filename`(optional).

Elements have property `filename` will be transformed into binary format, otherwise it turns into utf8 string.

```js

  RNFetchBlob.fetch('POST', 'http://www.example.com/upload-form', {
    Authorization : "Bearer access-token",
    otherHeader : "foo",
    'Content-Type' : 'multipart/form-data',
  }, [
    // element with property `filename` will be transformed into `file` in form data
    { name : 'avatar', filename : 'avatar.png', data: binaryDataInBase64},
    // elements without property `filename` will be sent as plain text
    { name : 'name', data : 'user'},
    { name : 'info', data : JSON.stringify({
      mail : 'example@example.com',
      tel : '12345678'
    })},
  ]).then((resp) => {
    // ...
  }).catch((err) => {
    // ...
  })
```

What if you want to upload a file in some field ? Just like [upload a file from storage](#user-content-upload-a-file-from-storage) example, wrap `data` by `wrap` API (this feature is only available for `version >= v0.5.0`). On version >= `0.6.2`, it is possible to set custom MIME type when appending file to form data.

```js

  RNFetchBlob.fetch('POST', 'http://www.example.com/upload-form', {
    Authorization : "Bearer access-token",
    otherHeader : "foo",
    // this is required, otherwise it won't be process as a multipart/form-data request
    'Content-Type' : 'multipart/form-data',
  }, [
    // append field data from file path
    {
      name : 'avatar',
      filename : 'avatar.png',
      // Change BASE64 encoded data to a file path with prefix `RNFetchBlob-file://`.
      // Or simply wrap the file path with RNFetchBlob.wrap().
      data: RNFetchBlob.wrap(PATH_TO_THE_FILE)
    },
    {
      name : 'ringtone',
      filename : 'ring.mp3',
      // use custom MIME type
      type : 'application/mp3',
      // upload a file from asset is also possible in version >= 0.6.2
      data : RNFetchBlob.wrap(RNFetchBlob.fs.asset('default-ringtone.mp3'))
    }
    // elements without property `filename` will be sent as plain text
    { name : 'name', data : 'user'},
    { name : 'info', data : JSON.stringify({
      mail : 'example@example.com',
      tel : '12345678'
    })},
  ]).then((resp) => {
    // ...
  }).catch((err) => {
    // ...
  })
```

#### Upload/Download progress

In `version >= 0.4.2` it is possible to know the upload/download progress. On Android, only download progress is supported. See [wiki](https://github.com/wkh237/react-native-fetch-blob/wiki/Fetch-API#fetchprogresseventlistenerpromisernfetchblobresponse) for more information.

```js
  RNFetchBlob.fetch('POST', 'http://www.example.com/upload', {
      ... some headers,
      'Content-Type' : 'octet-stream'
    }, base64DataString)
    .progress((received, total) => {
        console.log('progress', received / total)
    })
    .then((resp) => {
      // ...
    })
    .catch((err) => {
      // ...
    })
```

#### Android Media Scanner, and Download Manager Support

If you want to make a file in `External Storage` becomes visible in Picture, Downloads, or other built-in apps, you will have to use `Media Scanner` or `Download Manager`.

**Media Scanner**

Media scanner scan the file and categorize by given MIME type, if MIME type not specified, it will try to resolve the file using its file extension.

```js

RNFetchBlob
    .config({
        // DCIMDir is in external storage
        path : dirs.DCIMDir + '/music.mp3'
    })
    .fetch('GET', 'http://example.com/music.mp3')
    .then((res) => RNFetchBlob.fs.scanFile([ { path : res.path(), mime : 'audio/mpeg' } ]))
    .then(() => {
        // scan file success
    })
    .catch((err) => {
        // scan file error
    })
```

**Download Manager**

When download large files on Android it is recommended to use `Download Manager`, it supports lot of native features like progress bar, and notification, also the download task will be handled by OS, and more effective.

<img src="img/download-manager.png" width="256">

When using DownloadManager, `fileCache` and `path` properties in `config` will not take effect, because Android DownloadManager can only store files to external storage. When download complete, DownloadManager will generate a file path so that you can deal with it.

```js
RNFetchBlob
    .config({
        addAdnroidDownloads : {
            useDownloadManager : true, // <-- this is the only thing required
            // Optional, override notification setting (default to true)
            notification : false,
            // Optional, but recommended since android DownloadManager will fail when
            // the url does not contains a file extension, by default the mime type will be text/plain
            mime : 'text/plain',
            description : 'File downloaded by download manager.'
        }
    })
    .fetch('GET', 'http://example.com/file/somefile')
    .then((resp) => {
      // the path of downloaded file
      resp.path()
    })
```


**Download Notification and Visibiliy in Download App (Android Only)**

<img src="img/android-notification1.png" width="256">
<img src="img/android-notification2.png" width="256">


If you want to display a notification when file's completely download to storage (as the above), or make the downloaded file visible in "Downloads" app. You have to add some options to `config`.

```js
RNFetchBlob.config({
  fileCache : true,
  // android only options, these options be a no-op on IOS
  addAndroidDownloads : {
    // Show notification when response data transmitted
    notification : true,
    // Title of download notification
    title : 'Great ! Download Success ! :O ',
    // File description (not notification description)
    description : 'An image file.',
    mime : 'image/png',
    // Make the file scannable  by media scanner
    meidaScannable : true,
  }
})
.fetch('GET', 'http://example.com/image1.png')
.then(...)
```

#### File Access

File access APIs were made when developing `v0.5.0`, which helping us write tests, and was not planned to be a part of this module. However we realized that, it's hard to find a great solution to manage cached files, every one who use this moudle may need these APIs for there cases.

Before start using file APIs, we recommend read [Differences between File Source](https://github.com/wkh237/react-native-fetch-blob/wiki/File-System-Access-API#differences-between-file-source) first.

File Access APIs
- [asset (0.6.2)](https://github.com/wkh237/react-native-fetch-blob/wiki/File-System-Access-API#assetfilenamestringstring)
- [dirs](https://github.com/wkh237/react-native-fetch-blob/wiki/File-System-Access-API#dirs)
- [createFile](https://github.com/wkh237/react-native-fetch-blob/wiki/File-System-Access-API#createfilepath-data-encodingpromise)
- [writeFile (0.6.0)](https://github.com/wkh237/react-native-fetch-blob/wiki/File-System-Access-API#writefilepathstring-contentstring--array-encodingstring-appendbooleanpromise)
- [appendFile (0.6.0) ](https://github.com/wkh237/react-native-fetch-blob/wiki/File-System-Access-API#appendfilepathstring-contentstring--array-encodingstringpromise)
- [readFile (0.6.0)](https://github.com/wkh237/react-native-fetch-blob/wiki/File-System-Access-API#readfilepath-encodingpromise)
- [readStream](https://github.com/wkh237/react-native-fetch-blob/wiki/File-System-Access-API#readstreampath-encoding-buffersizepromise)
- [writeStream](https://github.com/wkh237/react-native-fetch-blob/wiki/File-System-Access-API#writestreampathstring-encodingstring-appendbooleanpromise)
- [unlink](https://github.com/wkh237/react-native-fetch-blob/wiki/File-System-Access-API#unlinkpathstringpromise)
- [mkdir](https://github.com/wkh237/react-native-fetch-blob/wiki/File-System-Access-API#mkdirpathstringpromise)
- [ls](https://github.com/wkh237/react-native-fetch-blob/wiki/File-System-Access-API#lspathstringpromise)
- [mv](https://github.com/wkh237/react-native-fetch-blob/wiki/File-System-Access-API#mvfromstring-tostringpromise)
- [cp](https://github.com/wkh237/react-native-fetch-blob/wiki/File-System-Access-API#cpsrcstring-deststringpromise)
- [exists](https://github.com/wkh237/react-native-fetch-blob/wiki/File-System-Access-API#existspathstringpromise)
- [isDir](https://github.com/wkh237/react-native-fetch-blob/wiki/File-System-Access-API#isdirpathstringpromise)
- [stat](https://github.com/wkh237/react-native-fetch-blob/wiki/File-System-Access-API#statpathstringpromise)
- [lstat](https://github.com/wkh237/react-native-fetch-blob/wiki/File-System-Access-API#lstatpathstringpromise)
- [scanFile (Android only)](https://github.com/wkh237/react-native-fetch-blob/wiki/File-System-Access-API#scanfilepathstringpromise-androi-only)

See [File API](https://github.com/wkh237/react-native-fetch-blob/wiki/File-System-Access-API) for more information

#### File Stream

In `v0.5.0` we've added  `writeStream` and `readStream`, which allows your app read/write data from file path. This API creates a file stream, rather than convert whole data into BASE64 encoded string, it's handy when processing **large files**.

When calling `readStream` method, you have to `open` the stream, and start to read data.

```js
let data = ''
RNFetchBlob.fs.readStream(
    // encoding, should be one of `base64`, `utf8`, `ascii`
    'base64',
    // file path
    PATH_TO_THE_FILE,
    // (optional) buffer size, default to 4096 (4095 for BASE64 encoded data)
    // when reading file in BASE64 encoding, buffer size must be multiples of 3.
    4095)
.then((ifstream) => {
    ifstream.open()
    ifstream.onData((chunk) => {
      // when encoding is `ascii`, chunk will be an array contains numbers
      // otherwise it will be a string
      data += chunk
    })
    ifstream.onError((err) => {
      console.log('oops', err)
    })
    ifstream.onEnd(() => {  
      <Image source={{ uri : 'data:image/png,base64' + data }}
    })
})
```

When use `writeStream`, the stream is also opened immediately, but you have to `write`, and `close` by yourself.

```js
RNFetchBlob.fs.writeStream(
    PATH_TO_FILE,
    // encoding, should be one of `base64`, `utf8`, `ascii`
    'utf8',
    // should data append to existing content ?
    true)
.then((ofstream) => {
    ofstream.write('foo')
    ofstream.write('bar')
    ofstream.close()
})

```

#### Cache File Management

When using `fileCache` or `path` options along with `fetch` API, response data will automatically stored into file system. The files will **NOT** removed unless you `unlink` it. There're several ways to remove the files

```js

  // remove file using RNFetchblobResponse.flush() object method
  RNFetchblob.config({
      fileCache : true
    })
    .fetch('GET', 'http://example.com/download/file')
    .then((res) => {
      // remove cached file from storage
      res.flush()
    })

  // remove file by specifying a path
  RNFetchBlob.fs.unlink('some-file-path').then(() => {
    // ...
  })

```

You can also grouping requests by using `session` API, and use `dispose` to remove them all when needed.

```js

  RNFetchblob.config({
    fileCache : true
  })
  .fetch('GET', 'http://example.com/download/file')
  .then((res) => {
    // set session of a response
    res.session('foo')
  })  

  RNFetchblob.config({
    // you can also set session beforehand
    session : 'foo'
    fileCache : true
  })
  .fetch('GET', 'http://example.com/download/file')
  .then((res) => {
    // ...
  })  

  // or put an existing file path to the session
  RNFetchBlob.session('foo').add('some-file-path')
  // remove a file path from the session
  RNFetchBlob.session('foo').remove('some-file-path')
  // list paths of a session
  RNFetchBlob.session('foo').list()
  // remove all files in a session
  RNFetchBlob.session('foo').dispose().then(() => { ... })

```

#### Self-Signed SSL Server

By default, react-native-fetch-blob does NOT allow connection to unknown certification provider since it's dangerous. If you're going to connect a server with self-signed certification, add `trusty` to `config`. This function is available for version >= `0.5.3`

```js
RNFetchBlob.config({
  trusty : true
})
.then('GET', 'https://mysite.com')
.then((resp) => {
  // ...
})
```

## Changes

| Version | |
|---|---|
| 0.6.4 | Fix rnpm link script. |
| 0.6.3 | Fix performance issue on IOS, increase max concurrent request limitation from 1. |
| 0.6.2 | Add support of asset file and camera roll files, Support custom MIME type when sending multipart request, thanks @smartt |
| 0.6.1 | Fix #37 progress report API issue on IOS |
| 0.6.0 | Add readFile and writeFile API for easier file access, also added Android download manager support. |
| 0.5.8 | Fix #33 PUT request will always be sent as POST on Android |
| 0.5.7 | Fix #31 #30 Xcode pre 7.3 build error |
| 0.5.6 | Add support for IOS network status indicator. Fix file stream ASCII reader bug. |
| 0.5.5 | Remove work in progress code added in 0.5.2 which may cause memory leaks. |
| 0.5.4 | Fix #30 #31 build build error, and improve memory efficiency. |
| 0.5.3 | Add API for access untrusted SSL server |
| 0.5.2 | Fix improper url params bug [#26](https://github.com/wkh237/react-native-fetch-blob/issues/26) and change IOS HTTP implementation from NSURLConnection to NSURLSession |
| 0.5.0 | Upload/download with direct access to file storage, and also added file access APIs |
| 0.4.2 | Supports upload/download progress |
| 0.4.1 | Fix upload form-data missing file extension problem on Android |
| 0.4.0 | Add base-64 encode/decode library and API |
| ~0.3.0 | Upload/Download octet-stream and form-data |

### Development

If you're interested in hacking this module, check our [development guide](https://github.com/wkh237/react-native-fetch-blob/wiki/Home), there might be some helpful information.
Please feel free to make a PR or file an issue.
