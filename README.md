# react-native-fetch-blob

Since react-native `fetch` API [does not marshals `Blob` data in request/response
body](https://github.com/facebook/react-native/issues/854), I made this plugin which send/receive HTTP request/response that have `Blob` body content.

This plugin simply convert given base64 string into blob format and send the request in a new thread. The process is done in native code, it supports both Android (uses awesome library  [AsyncHttpClient](https://github.com/AsyncHttpClient/async-http-client])) and IOS.

If you're dealing with image or file server that requires an `Authorization` token in the header, you might try this plugin (this is also the reason why I made this plugin), the source code is very simple, just an implementation of native HTTP request.

## Installation

Install package from npm

```sh
npm install --save react-native-fetch-blob
```

Link package using [rnpm](https://github.com/rnpm/rnpm)

```sh
rnpm link
```

## API

#### `Promise<FetchBlobResponse> fetch(url, headers, body)`

Send a HTTP request uses given headers and body, and return a Promise.

#### url:`string` Required
HTTP request destination url.
#### headers:`object` (Optional)
Headers of HTTP request, value of headers should be `stringified`.
#### body:`string` (Optional)
Body of the HTTP request, body MUST be a BASE64 string, this string will be converted into byte array in native code.

### FetchBlobResponse

When `fetch` success, it resolve a `FetchBlobResponse` object as first argument. `FetchBlobResponse` object has the following methods (these method are synchronous, so you might take quite a performance impact if the file is big):

#### base64():string
  returns base64 string of response data (done in native context)
#### json():object
  returns json parsed object (done in js context)
#### text():string
  returns decoded base64 string (done in js context)
#### blob():Blob
  returns Blob object (one in js context)

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
    let blob = res.blob()
    let text = res.text()
    let json = res.json()

  })
  // Status code is not 200
  .catch((errorMessage, statusCode) => {
    // error handling
  })
```

####  Upload example : Dropbox [files-upload](https://www.dropbox.com/developers/documentation/http/documentation#files-upload) API

`react-native-fetch-blob` will convert the base64 string in `body` to binary format in native code.

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

### TODO

* Save file to storage
* Native async format converion
