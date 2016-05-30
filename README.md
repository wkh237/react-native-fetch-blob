# react-native-fetch-blob [![npm version](https://badge.fury.io/js/react-native-fetch-blob.svg)](https://badge.fury.io/js/react-native-fetch-blob) ![](https://img.shields.io/badge/PR-Welcome-brightgreen.svg)

## v0.5.0 Work In Progress README.md

A react-native module for upload, and download files with custom headers. Supports blob response data, upload/download progress, and file reader API that enables you process file content in js context (such as display image data, string or image process).

If you're dealing with image or file server that requires special field in the header, or you're having problem with `fetch` API when receiving blob data, you might try this module.

See [[fetch] Does fetch with blob() marshal data across the bridge?](https://github.com/facebook/react-native/issues/854) for the reason why we made this module.

In latest version (v0.5.0), you can upload/download files directly with file path. We've also introduced `file stream` API for reading **large files** from storage, see [Examples](#user-content-usage) bellow.

This module implements native HTTP request, supports both Android (uses awesome native library  [AsyncHttpClient](https://github.com/AsyncHttpClient/async-http-client])) and IOS.

## Usage

* [Installation](#user-content-installation)
* [Examples](#user-content-usage)
 * [Download file](#user-content-download-example--fetch-files-that-needs-authorization-token)
 * [Upload file](#user-content-upload-example--dropbox-files-upload-api)
 * [Multipart/form upload](#user-content-multipartform-data-example--post-form-data-with-file-and-data)
 * [Upload/Download progress](#user-content-uploaaddownload-progress)
 * [File stream reader](#user-content-file-stream-reader)
 * [Release cache files](#user-content-release-cache-files)
* [API](#user-content-api)

## Installation

Install package from npm

```sh
npm install --save react-native-fetch-blob
```

Link package using [rnpm](https://github.com/rnpm/rnpm)

```sh
rnpm link
```

## Usage

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

But in some cases, you might need a file extension even the file is temporary cached. For instance, when use the file path as source of `Image` element the path should end with something like .png or .jpg, you can do this by put one more option in to `config`.

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

What's more, if you prefer a specific path, rather a random generated path, you can use `path` option. We've added a [getSystemDirs](#user-content-getsysdirs) API in v0.5.0 that lists several common used directories.

```js
RNFetchBlob.getSystemDirs().then((dirs) => {
  RNFetchBlob
    .config({
      // response data will be saved to this path if it has access right.
      path : dirs.DocumentDir + 'path-to-file.anything'
    })
    .fetch('GET', 'http://www.example.com/file/example.zip', {
      //some headers ..
    })
    .then((res) => {
      // the path should be dirs.DocumentDir + 'path-to-file.anything'
      console.log('The file saved to ', res.path())
    })
})
```

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
  }, base64ImageString)
  .then((res) => {
    console.log(res.text())
  })
  .catch((err) => {
    // error handling ..
  })
```

#### Upload a file from storage

If you're going to use a `file` in file system as request body, just push the path with prefix `RNFetchBlob-file://`.

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
    // Change BASE64 encoded data to a file path with prefix `RNFetchBlob-file://` when the data comes from a file
  }, 'RNFetchBlob-file://' + PATH_TO_THE_FILE)
  .then((res) => {
    console.log(res.text())
  })
  .catch((err) => {
    // error handling ..
  })
```

#### Multipart/form-data example : Post form data with file and data

In `version >= 0.3.0` you can also post files with form data,  just put an array in `body`, with object elements with property `name`, `data`, and `filename`(optional).

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

What if some fields contains a file in file storage ? Just like [upload a file from storage](#user-content-upload-a-file-from-storage) example, change the `data` to path of the file with a prefix `RNFetchBlob-file://`

```js

  RNFetchBlob.fetch('POST', 'http://www.example.com/upload-form', {
    Authorization : "Bearer access-token",
    otherHeader : "foo",
    'Content-Type' : 'multipart/form-data',
  }, [
    // append field data from file path
    { name : 'avatar',
      filename : 'avatar.png',
      // Change BASE64 encoded data to a file path with prefix `RNFetchBlob-file://` when the data comes from a file
      data: 'RNFetchBlob-file://' + PATH_TO_THE_FILE
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

#### Handle files in storage

In v0.5.0 we've added a `readStream` API, which allows you read data from file directly. This API creates a file stream, rather than a BASE64 encoded data of the file, so that you won't have to worry if large files explodes the memory.

```js
let data = ''
let stream = RNFetchBlob.readStream(
    // encoding, should be one of `base64`, `utf8`, `ascii`
    'base64',
    // file path
    PATH_TO_THE_FILE,
    // (optional) buffer size, default to 4096 (4098 for BASE64 encoded data)
    // when reading file in BASE64 encoding, buffer size must be multiples of 3.
    4098)
stream.onData((chunk) => {
  data += chunk
})
stream.onError((err) => {
  console.log('oops', err)
})
stream.onEnd(() => {  
  <Image source={{ uri : 'data:image/png,base64' + data }}
})
```

#### Release cache files

TODO

## API

#### `getSystemDirs`

TODO

#### `config`

TODO

#### `fetch(method, url, headers, body):Promise<FetchBlobResponse>`

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

#### `fetch(...).progress(eventListener):Promise<FetchBlobResponse>` added in `0.4.2`

Register on progress event handler for a fetch request.

#### eventListener:`(sendOrReceivedBytes:number, totalBytes:number)`

A function that triggers when there's data received/sent, first argument is the number of sent/received bytes, and second argument is expected total bytes number.

#### `base64`

A helper object simply uses [base-64](https://github.com/mathiasbynens/base64) for decode and encode BASE64 data.

```js
RNFetchBlob.base64.encode(data)
RNFetchBlob.base64.decode(data)
```

#### `unlink`

TODO

#### `readStream`

TODO

#### FetchBlobResponse

When `fetch` success, it resolve a `FetchBlobResponse` object as first argument. `FetchBlobResponse` object has the following methods (these method are synchronous, so you might take quite a performance impact if the file is big)

#### base64():string
  returns base64 string of response data (done in native context)
#### json():object
  returns json parsed object (done in js context)
#### text():string
  returns decoded base64 string (done in js context)

## Major Changes

| Version | |
|---|---|
| ~0.3.0 | Upload/Download octet-stream and form-data |
| 0.4.0 | Add base-64 encode/decode library and API |
| 0.4.1 | Fixe upload form-data missing file extension problem on Android |
| 0.4.2 | Supports upload/download progress |
| 0.5.0 | Upload/download with direct access to file storage, and also supports read file with file stream |

### TODOs

* Customizable Multipart MIME type
* Improvement of file cache management API

### Development

If you're interested in hacking this module, check our [development guide](https://github.com/wkh237/react-native-fetch-blob/wiki/Development-Guide), there might be some helpful information.
Please feel free to make a PR or file an issue.
