# react-native-fetch-blob [![npm version](https://badge.fury.io/js/react-native-fetch-blob.svg)](https://badge.fury.io/js/react-native-fetch-blob)

Since react-native `fetch` API [does not marshals `Blob` data in request/response
body](https://github.com/facebook/react-native/issues/854), I made this plugin which send/receive HTTP request/response that have `Blob` body content.

This plugin simply convert given base64 string into blob format and send the request in a new thread. The process is done in native code, it supports both Android (uses awesome library  [AsyncHttpClient](https://github.com/AsyncHttpClient/async-http-client])) and IOS.

If you're dealing with image or file server that requires an `Authorization` token in the header, you might try this plugin (this is also the reason why I made this plugin), the source code is very simple, just an implementation of native HTTP request.


* [Installation](#user-content-installation)
* [Examples](#user-content-usage)
 * [Download file](#user-content-download-example--fetch-files-that-needs-authorization-token)
 * [Upload file](#user-content-upload-example--dropbox-files-upload-api)
 * [Multipart/form upload](user-content-multipartform-data-example--post-form-data-with-file-and-data)

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

The above code will become something like this in your request body

```
--RNFetchBlob-79338624
Content-Disposition: form-data; name="avatar"; filename="avatar.png"
Content-Type: application/octet-stream
�PNG

���
IHDR��G���������ʣ��IDATx�흋s���/Ծl���رӧmu괝�kڙ��{���Q��@@��JQ[j�TA���,�Z"�
���$��	!B `_�ٲ�9���7����B��ݻ��w���s��u����F�6n��r�@������9� G�������#��r�@������9� G��@������9� G�������#��r�@������9� G�����������9� Ǩ�����ᝲg�*������Z���$���������9�.�c�%��U�wn5�hO��{���@?�=@����?~Wvo^�"ő���"͏ޒ��*��r,=�f�$����-E���_���n�^ �Ҡ㞏}��Jq5�����Iv�5<\��1�ɖ��3���*1Z�����O?��
�K-�
--RNFetchBlob-79338624
Content-Disposition: form-data; name="name";
Content-Type: text/plain

user
--RNFetchBlob-79338624
Content-Disposition: form-data; name="info";
Content-Type: text/plain

{"mail" : "example@example.com", "tel" : "12345678"}
--RNFetchBlob-79338624--
```


## API

#### `Promise<FetchBlobResponse> fetch(method, url, headers, body)`

Send a HTTP request uses given headers and body, and return a Promise.

#### method:`string` Required
HTTP request method, can be one of `get`, `post`, `delete`, and `put`, case-insensitive.
#### url:`string` Required
HTTP request destination url.
#### headers:`object` (Optional)
Headers of HTTP request, value of headers should be `stringified`, if you're uploading binary files, content-type should be `application/octet-stream` or `multipart/form-data`(see examples above).
#### body:`string | Array<Object>` (Optional)
Body of the HTTP request, body can either be a BASE64 string, or an array contains object elements, each element should use the following format.



When body is a base64 string , this string will be converted into byte array in native code, and the request body will be sent as `application/octet-stream`.

### FetchBlobResponse

When `fetch` success, it resolve a `FetchBlobResponse` object as first argument. `FetchBlobResponse` object has the following methods (these method are synchronous, so you might take quite a performance impact if the file is big)

#### base64():string
  returns base64 string of response data (done in native context)
#### json():object
  returns json parsed object (done in js context)
#### text():string
  returns decoded base64 string (done in js context)
#### blob():Blob
  returns Blob object (one in js context)

### TODO

* Save file to storage
* Native async format conversion
* Custom MIME type in form data


**I'm not very new to native module development in RN, if there's any problem, please feel free to contact with me :D** 
