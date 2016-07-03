# react-native-fetch-blob [![npm version](https://img.shields.io/badge/npm package-0.5.8-brightgreen.svg)](https://badge.fury.io/js/react-native-fetch-blob) ![](https://img.shields.io/badge/PR-Welcome-brightgreen.svg) ![](https://img.shields.io/badge/in progress-0.6.0-yellow.svg)

A module provides upload, download, and files access API. Supports file stream read/write for process large files.

**Why do we need this**

At this moment, React Native does not support `Blob` object yet, so if you're going to send/receive binary data via `fetch` API, that might not work as you expect. See [[fetch] Does fetch with blob() marshal data across the bridge?](https://github.com/facebook/react-native/issues/854).

Hence you may getting into trouble in some use cases. For example, displaying an image on image server but the server requires a specific field(such as "Authorization") in headers or body, so you can't just pass the image uri to `Image` component because that will probably returns a 401 response. With help of this module, you can send a HTTP request with any headers, and decide how to handle the response/reqeust data. The response data can be just simply converted into BASE64 string, or store to a file directly so that you can read it by file stream or use it's path.

This module is designed to be a substitution of `blob`, there's a set of file access API including basic CRUD method, and file stream reader/writer. Also it has a special `fetch` implementation that supports binary request/response body.

**Pre v0.5.0 Users**

This update is `backward-compatible` generally you don't have to change existing code unless you're going to use new APIs. In latest version (v0.5.0), new APIs can either `upload` or `download` files simply using a file path. It's much more memory efficent in some use case. We've also introduced `fs` APIs for access files, and `file stream` API that helps you read/write files (especially for **large ones**), see [Examples](#user-content-usage) bellow. This module implements native methods, supports both Android (uses awesome native library  [AsyncHttpClient](https://github.com/AsyncHttpClient/async-http-client])) and IOS.

## TOC

* [Installation](#user-content-installation)
* [Guide](#user-content-guide)
 * [Download file](#user-content-download-example--fetch-files-that-needs-authorization-token)
 * [Upload file](#user-content-upload-example--dropbox-files-upload-api)
 * [Multipart/form upload](#user-content-multipartform-data-example--post-form-data-with-file-and-data)
 * [Upload/Download progress](#user-content-uploaaddownload-progress)
 * [Android Media Scanner, and Downloads App Support](#user-content-android-media-scanner-and-downloads-app-support)
 * [File access](#user-content-file-access)
 * [File stream](#user-content-file-stream)
 * [Manage cached files](#user-content-manage-cached-files)
 * [Self-Signed SSL Server](#user-content-self-signed-ssl-server)
* [API](#user-content-api)
 * [config](#user-content-configoptionsrnfetchblobconfigfetch)
 * [fetch](#user-content-fetchmethod-url-headers-bodypromisefetchblobresponse)
 * [session](#user-content-sessionnamestringrnfetchblobsession)
 * [base64](#user-content-base64)
 * [fs](#user-content-fs)
* [Development](#user-content-development)

## Installation

Install package from npm

```sh
npm install --save react-native-fetch-blob
```

Link package using [rnpm](https://github.com/rnpm/rnpm)

```sh
rnpm link
```

**Grant Permission to External storage for Android 5.0 or lower**

Mechanism about granting Android permissions has slightly different since Android 6.0 released, please refer to [Officail Document](https://developer.android.com/training/permissions/requesting.html).

If you're going to access external storage (say, SD card storage) for `Android 5.0` (or lower) devices, you might have to add the following line to `AndroidManifetst.xml`.

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

**Grant Access Permission for Android 6.0**

Beginning in Android 6.0 (API level 23), users grant permissions to apps while the app is running, not when they install the app. So adding permissions in `AndroidManifest.xml` won't work in Android 6.0 devices. To grant permissions in runtime, you might use modules like [react-native-android-permissions](https://github.com/lucasferreira/react-native-android-permissions).

## Guide

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

The simplest way is give a `fileCach` option to config, and set it to `true`. This will let the incoming response data stored in a temporary path **wihout** any file extension.

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
    imageView = <Image source={{ uri : Platform.OS === 'android' ? 'file://' : '' + res.path() }}/>
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

What if you want to upload a file in some field ? Just like [upload a file from storage](#user-content-upload-a-file-from-storage) example, wrap `data` by `wrap` API (this feature is only available for `version >= v0.5.0`)

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

In `version >= 0.4.2` it is possible to know the upload/download progress.

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

#### Android Media Scanner, and Downloads App Support

If you want to make a file in `External Storage` becomes visible in Picture, Music, or other built-in apps, you will have to use `Media Scanner`. To make this happend, use `scanFile` method in `fs`.


```js

RNFetchBlog
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

If mime is null or undefined, then the mime type will be inferred from the file extension.

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

File access APIs were made when developing `v0.5.0`, which helping us write tests, and was not planned to be a part of this module. However I realized that, it's hard to find a great solution to manage cached files, every one who use this moudle may need those APIs for there cases.

Here's the list of `fs` APIs

- dirs
- createFile
- readStream
- writeStream
- unlink
- mkdir
- ls
- mv
- cp
- exists
- isDir
- lstat
- stat
- scanFile (Android Only)

See [fs chapter](#user-content-fs) for more information

#### File Stream

In `v0.5.0` we've added  `writeStream` and `readStream`, which allows your app read/write data from file path. This API creates a file stream, rather than convert whole data into BASE64 encoded string, it's handy when processing **large files**.

When calling `readStream` method, you have to `open` the stream, and start to read data.

```js
let data = ''
RNFetchBlob.readStream(
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
RNFetchBlob.writeStream(
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

---

## API

### `config(options:RNFetchBlobConfig):fetch`

`0.5.0`

Config API was introduced in `v0.5.0` which provides some options for the `fetch` task.

see [RNFetchBlobConfig](#user-content-configoptionsrnfetchblobconfigfetch)

### `fetch(method, url, headers, body):Promise<FetchBlobResponse>`

`legacy`

Send a HTTP request uses given headers and body, and return a Promise.

#### method:`string` Required
HTTP request method, can be one of `get`, `post`, `delete`, and `put`, case-insensitive.
#### url:`string` Required
HTTP request destination url.
#### headers:`object` (Optional)
Headers of HTTP request, value of headers should be `stringified`, if you're uploading binary files, content-type should be `application/octet-stream` or `multipart/form-data`(see examples above).
#### body:`string | Array<Object>` (Optional)
Body of the HTTP request, body can either be a BASE64 string, or an array contains object elements, each element have 2  required property `name`, and `data`, and 1 optional property `filename`, once `filename` is set, content in `data` property will be consider as BASE64 string that will be converted into byte array later.
When body is a base64 string , this string will be converted into byte array in native code, and the request body will be sent as `application/octet-stream`.

### `fetch(...).progress(eventListener):Promise<FetchBlobResponse>`

`0.4.2`

Register on progress event handler for a fetch request.

#### eventListener:`(sendOrReceivedBytes:number, totalBytes:number)`

A function that triggers when there's data received/sent, first argument is the number of sent/received bytes, and second argument is expected total bytes number.

### `wrap(path:string):string`

Simply prepend `RNFetchBlob-file://` to a path, this make the file path becomes recognizable to native `fetch` method.

### `session(name:string):RNFetchBlobSession`

Session API helps managing cached files, the following code, will try to return an existing session object with the given `name`, if it does not exist, create one.

```js
RNFetchBlob.session('mysession')
```
see [Class RNFetchBlobSession](#user-content-rnfetchblobsession) for usage.

### `base64`


`0.4.2`

A helper class simply uses [base-64](https://github.com/mathiasbynens/base64) for decode and encode BASE64 data.

```js
RNFetchBlob.base64.encode(data)
RNFetchBlob.base64.decode(data)
```

### `fs`

`0.5.0`

#### dirs

This constant is a hash map contains common used folders:
- DocumentDir
- CacheDir
- DCIMDir (Android Only)
- DownloadDir (Android Only)
- MusicDir (Android Only)
- PictureDir (Android Only)
- MovieDir (Android Only)
- RingtoneDir (Android Only)

```js
const dirs = RNFetchBlob.fs.dirs
console.log(dirs.DocumentDir)
console.log(dirs.CacheDir)
console.log(dirs.DCIMDir)
console.log(dirs.DownloadDir)
```
> If you're going to make downloaded file visible in Android `Downloads` app, please see [Show Downloaded File and Notification in Android Downloads App](#user-content-show-downloaded-file-and-notifiction-in-android-downloads-app).

### createFile(path, data, encoding):Promise

#### path:`string`
The path which this new file will be created.
#### data:`string` | `Array<number>`
Content of the new file, when `encoding` is `ascii`, this argument shoud be an array contains number 0~255.
#### encoding:`utf8` | `base64` | `ascii`
Encoding of content.

the following expressions are equivalent.

```js
const fs = RNFetchBlob.fs
const base64 = RNFetchBlob.base64
fs.createFile(NEW_FILE_PATH, 'foo', 'utf8')
fs.createFile(NEW_FILE_PATH, [102, 111, 111], 'ascii')
fs.createFile(NEW_FILE_PATH, base64.encode('foo'), 'base64')
```

### writeStream(path:string, encoding:string, append:boolean):Promise<WriteStream>

#### path:`string`
The path to the file the stream is writing to.
#### encoding:`utf8` | `base64` | `ascii`
Encoding of input data.
#### append:`boolean`(optional, default to `false`)
Will new data append after existing file or not.

Calling `writeStream` method will returns a Promise, which resolves a `RNFetchBlobWriteSteam` instance when stream opened successfully.

```js
// write utf8 data
RNFetchBlob.fs.writeStream(PATH_TO_WRITE, 'utf8')
    .then((stream) => {
        stream.write('foo')
        return stream.close()
    })
// write ASCII data
RNFetchBlob.fs.writeStream(PATH_TO_WRITE, 'ascii')
    .then((stream) => {
        // write char `f`
        stream.write([102])
        // write char `o`, `o`
        stream.write([111,111])
        return stream.close()
    })
// write BASE64
RNFetchBlob.fs.writeStream(PATH_TO_WRITE, 'base64')
    .then((stream) => {
        stream.write(RNFetchBlob.base64.encode('foo'))
        return stream.close()
    })

```

#### readStream(path, encoding, bufferSize):Promise<ReadStream>

##### path:`string`
The path to the file the stream is reading from.
##### encoding:`string`
Encoding of the data.
##### bufferSize:`number`(optional)
Buffer size of read stream, default to `4096` and `4095`(when encoding is `base64`)

`readStream` returns a promise which will resolve `RNFetchBlobReadStream`.

```js
RNFetchBlob.fs.readStream(PATH_TO_READ, 'utf8')
    .then((stream) => {
        let data = ''
        stream.open()
        stream.onData((chunk) => {
            chunk += data
        })
        stream.onEnd(() => {
            console.log(data)
        })
    })
```

#### mkdir(path:string):Promise

Create a directory named `path`

```js
RNFetchBlob.fs.mkdir(PATH_TO_CREATE)
.then(() => { ... })
.catch((err) => { ... })
```

#### ls(path:string):Promise<Array<String>>

List files and directories in a `path`

```js
RNFetchBlob.fs.ls(PATH_TO_LIST)
    // files will an array contains filenames
    .then((files) => {
        console.log(files)
    })
```

#### mv(from:string, to:string):Promise

Move a file's location

```js
RNFetchBlob.fs.mv(FROM_PATH, TO_PATH)
.then(() => { ... })
.catch(() => { ... })
```

#### cp(src:string, dest:string):Promise

Copy a file.

```js
RNFetchBlob.fs.mv(SRC_PATH, DEST_PATH)
.then(() => { ... })
.catch(() => { ... })
```

#### exists(path:string):Promise<boolean>

Check if a file exist at `path`

```js
RNFetchBlob.fs.exists(PATH_OF_FILE)
.then((exist) => {
    console.log(`file ${exist ? '' : 'not'} exists`)
})
.catch(() => { ... })
```

#### isDir(path:string):Promise<boolean>

Check the file at `path` is a directory or not. Resolves with `false` when the path is not a directory, or it does not exists.

```js
RNFetchBlob.fs.exists(PATH_OF_FILE)
.then((isDir) => {
    console.log(`file is ${isDir ? '' : 'not'} a directory`)
})
```

#### unlink(path:string):Promise<boolean>

Delete a file at `path`

```js
RNFetchBlob.fs.unlink(path)
.then(() => { ... })
.catch((err) => { ... })
```

#### lstat(path:string):Promise<RNFetchBlobStat>

Get statistic data of files in a directory, the result data will be an array of [RNFetchBlobStat](#user-content-rnfetchblobstat).

```js
RNFetchBlob.fs.lstat(PATH_OF_A_FOLDER)
    .then((stats) => {})
    .catch((err) => {})
```

#### stat(path:string):Promise<RNFetchBlobStat>

Similar get statistic a data or a directory. the result data will be a [RNFetchBlobStat](#user-content-rnfetchblobstat).

```js
RNFetchBlob.fs.stat(PATH_OF_THE_TARGET)
    .then((stats) => {})
    .catch((err) => {})
```

#### scanFile(path:string):Promise (Androi Only)

Connect `Media Scanner` and scan the file. see [Android Media Scanner, and Downloads App Support](#user-content-android-media-scanner-and-downloads-app-support) chapter for more information.

---

## Types

### RNFetchBlobConfig

A set of configurations that will be injected into a `fetch` method, with the following properties.

#### indicator:boolean
  `0.5.6`
  Set this property to `true` to display a network indicator on status bar, this feature is only supported on IOS.

#### trusty:boolean
  `0.5.3`
  Set this property to `true` will allow the request create connection with server have self-signed SSL certification. This is not recommended to use in production.

#### fileCache:boolean
  Set this property to `true` will makes response data of the `fetch` stored in a temp file, by default the temp file will stored in App's own root folder with file name template `RNFetchBlob_tmp${timestamp}`.
#### appendExt:string
  Set this property to change temp file extension that created by `fetch` response data.
#### path:string
  When this property has value, `fetch` API will try to store response data in the path ignoring `fileCache` and `appendExt` property.
#### addAndroidDownloads:object (Android only)
  This is an Android only property, it should be an object with the following properties :
  - title : title of the file
  - description : File description of the file.
  - mime : MIME type of the file. By default is `text/plain`
  - mediaScannable : A `boolean` value, see [Officail Document](https://developer.android.com/reference/android/app/DownloadManager.html#addCompletedDownload(java.lang.String, java.lang.String, boolean, java.lang.String, java.lang.String, long, boolean))
  - notification : A `boolean` value decide whether show a notification when download complete.

### RNFetchBlobResponse

When `fetch` success, it resolve a `FetchBlobResponse` object as first argument. `FetchBlobResponse` object has the following methods (these method are synchronous, so you might take quite a performance impact if the file is big)

#### base64():string
  returns base64 string of response data (done in native context)
#### json():object
  returns json parsed object (done in js context)
#### text():string
  returns decoded base64 string (done in js context)
#### path():string
  returns file path if the response data is cached in file
#### session(name:string):RNFetchBlobSession
  when the response data is cached in a file, this method adds the file into the session. The following usages are equivalent.
```js
RNFetchBlob.session('session-name').add(resp.path())
// or
resp.session('session-name')
```

### RNFetchBlobStat

Statistic data of a file, see the following sample object.

```js
{
    // file name
    filename : 'foo.png',
    // folder of the file or the folder itself
    path : '/path/to/the/file/wihout/file/name/',
    // size in byte
    size : 4901,
    // `file` or `directory`
    type : 'file',
    // last modified timestamp
    lastModified : 141323298
}
```


### RNFetchBlobSession

A `session` is an object that helps you manage files. It simply maintains a list of file path and let you use `dispose()`to delete files in this session once and for all.

#### add(path:string):RNFetchBlobSession
  Add a file path to this session.
#### remove(path:string):RNFetchBlobSession
  Remove a file path from this session (not delete the file).
#### list():Array<String>
  Returns an array contains file paths in this session.
#### dispose():Promise
  Delete all files according to paths in the session.

## Major Changes

| Version | |
|---|---|
| 0.5.8 | Fix #33 PUT request will always be sent as POST on Android |
| 0.5.7 | Fix #31 #30 Xcode pre 7.3 build error |
| 0.5.6 | Add support for IOS network status indicator. Fix file stream ASCII reader bug. |
| 0.5.5 | Remove work in progress code added in 0.5.2 which may cause memory leaks. |
| 0.5.4 | Fix #30 #31 build build error, and improve memory efficiency. |
| 0.5.3 | Add API for access untrusted SSL server |
| 0.5.2 | Fix improper url params bug [#26](https://github.com/wkh237/react-native-fetch-blob/issues/26) and change IOS HTTP implementation from NSURLConnection to NSURLSession |
| 0.5.0 | Upload/download with direct access to file storage, and also added file access APIs |
| 0.4.2 | Supports upload/download progress |
| 0.4.1 | Fixe upload form-data missing file extension problem on Android |
| 0.4.0 | Add base-64 encode/decode library and API |
| ~0.3.0 | Upload/Download octet-stream and form-data |

### In Progress (v0.6.0)

* Add `readFile` and `WriteFile` API to `fs`
* Add file access API for direct access RNFetchBlobResponse when the response is a file path
* Android Download Manager file download API

### Development

If you're interested in hacking this module, check our [development guide](https://github.com/wkh237/react-native-fetch-blob/wiki/Home), there might be some helpful information.
Please feel free to make a PR or file an issue.
