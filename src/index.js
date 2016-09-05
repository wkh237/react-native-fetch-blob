// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.
// @flow

import {
  NativeModules,
  DeviceEventEmitter,
  NativeAppEventEmitter,
  Platform,
  AsyncStorage,
} from 'react-native'
import type {
  RNFetchBlobNative,
  RNFetchBlobConfig,
  RNFetchBlobStream,
  RNFetchBlobResponseInfo
} from './types'
import StatefulPromise from './class/StatefulPromise.js'
import fs from './fs'
import getUUID from './utils/uuid'
import base64 from 'base-64'
import polyfill from './polyfill'
import android from './android'
const {
  RNFetchBlobSession,
  readStream,
  createFile,
  unlink,
  exists,
  mkdir,
  session,
  writeStream,
  readFile,
  ls,
  isDir,
  mv,
  cp
} = fs


const Blob = polyfill.Blob
const emitter = DeviceEventEmitter
const RNFetchBlob:RNFetchBlobNative = NativeModules.RNFetchBlob

// register message channel event handler.
emitter.addListener("RNFetchBlobMessage", (e) => {
  if(e.event === 'warn') {
    console.warn(e.detail)
  }
  else if (e.event === 'error') {
    throw e.detail
  }
  else {
    console.log("RNFetchBlob native message", e.detail)
  }
})

// Show warning if native module not detected
if(!RNFetchBlob || !RNFetchBlob.fetchBlobForm || !RNFetchBlob.fetchBlob) {
  console.warn(
    'react-native-fetch-blob could not find valid native module.',
    'please make sure you have linked native modules using `rnpm link`,',
    'and restart RN packager or manually compile IOS/Android project.'
  )
}

function wrap(path:string):string {
  return 'RNFetchBlob-file://' + path
}

/**
 * Calling this method will inject configurations into followed `fetch` method.
 * @param  {RNFetchBlobConfig} options
 *         Fetch API configurations, contains the following options :
 *         @property {boolean} fileCache
 *                   When fileCache is `true`, response data will be saved in
 *                   storage with a random generated file name, rather than
 *                   a BASE64 encoded string.
 *         @property {string} appendExt
 *                   Set this property to change file extension of random-
 *                   generated file name.
 *         @property {string} path
 *                   If this property has a valid string format, resonse data
 *                   will be saved to specific file path. Default string format
 *                   is : `RNFetchBlob-file://path-to-file`
 *         @property {string} key
 *                   If this property is set, it will be converted to md5, to
 *                   check if a file with this name exists.
 *                   If it exists, the absolute path is returned (no network
 *                   activity takes place )
 *                   If it doesn't exist, the file is downloaded as usual
 *         @property {number} timeout
 *                   Request timeout in millionseconds, by default it's 30000ms.
 *
 * @return {function} This method returns a `fetch` method instance.
 */
function config (options:RNFetchBlobConfig) {
  return { fetch : fetch.bind(options) }
}

/**
 * Create a HTTP request by settings, the `this` context is a `RNFetchBlobConfig` object.
 * @param  {string} method HTTP method, should be `GET`, `POST`, `PUT`, `DELETE`
 * @param  {string} url Request target url string.
 * @param  {object} headers HTTP request headers.
 * @param  {string} body
 *         Request body, can be either a BASE64 encoded data string,
 *         or a file path with prefix `RNFetchBlob-file://` (can be changed)
 * @return {Promise}
 *         This promise instance also contains a Customized method `progress`for
 *         register progress event handler.
 */
function fetch(...args:any):Promise {

  // create task ID for receiving progress event
  let taskId = getUUID()
  let options = this || {}
  let subscription, subscriptionUpload, stateEvent
  let respInfo = {}

  let promise = new Promise((resolve, reject) => {
    let [method, url, headers, body] = [...args]
    let nativeMethodName = Array.isArray(body) ? 'fetchBlobForm' : 'fetchBlob'

    // on progress event listener
    subscription = emitter.addListener('RNFetchBlobProgress', (e) => {
      if(e.taskId === taskId && promise.onProgress) {
        promise.onProgress(e.written, e.total)
      }
    })

    subscriptionUpload = emitter.addListener('RNFetchBlobProgress-upload', (e) => {
      if(e.taskId === taskId && promise.onUploadProgress) {
        promise.onUploadProgress(e.written, e.total)
      }
    })

    stateEvent = emitter.addListener('RNFetchBlobState', (e) => {
      respInfo = e
      if(e.taskId === taskId && promise.onStateChange) {
        promise.onStateChange(e)
      }
    })

    // When the request body comes from Blob polyfill, we should use special its ref
    // as the request body
    if( body instanceof Blob && body.isRNFetchBlobPolyfill) {
      body = body.getRNFetchBlobRef()
    }

    let req = RNFetchBlob[nativeMethodName]

    /**
     * Send request via native module, the response callback accepts three arguments
     * @callback
     * @param err {any} Error message or object, when the request success, this
     *                  parameter should be `null`.
     * @param rawType { 'utf8' | 'base64' | 'path'} RNFB request will be stored
     *                  as UTF8 string, BASE64 string, or a file path reference
     *                  in JS context, and this parameter indicates which one
     *                  dose the response data presents.
     * @param data {string} Response data or its reference.
     */
    req(options, taskId, method, url, headers || {}, body, (err, rawType, data) => {

      // task done, remove event listeners
      subscription.remove()
      subscriptionUpload.remove()
      stateEvent.remove()
      delete promise['progress']
      delete promise['uploadProgress']
      delete promise['stateChange']
      delete promise['cancel']
      promise.cancel = () => {}

      if(err)
        reject(new Error(err, respInfo))
      else {
        // response data is saved to storage, create a session for it
        if(options.path || options.fileCache || options.addAndroidDownloads
          || options.key || options.auto && respInfo.respType === 'blob') {
          if(options.session)
            session(options.session).add(data)
        }
        respInfo.rnfbEncode = rawType
        resolve(new FetchBlobResponse(taskId, respInfo, data))
      }

    })

  })

  // extend Promise object, add `progress`, `uploadProgress`, and `cancel`
  // method for register progress event handler and cancel request.
  promise.progress = (fn) => {
    promise.onProgress = fn
    RNFetchBlob.enableProgressReport(taskId)
    return promise
  }
  promise.uploadProgress = (fn) => {
    promise.onUploadProgress = fn
    RNFetchBlob.enableUploadProgressReport(taskId)
    return promise
  }
  promise.stateChange = (fn) => {
    promise.onStateChange = fn
    return promise
  }
  promise.cancel = (fn) => {
    fn = fn || function(){}
    subscription.remove()
    subscriptionUpload.remove()
    stateEvent.remove()
    RNFetchBlob.cancelRequest(taskId, fn)
  }
  promise.taskId = taskId

  return promise

}

/**
 * RNFetchBlob response object class.
 */
class FetchBlobResponse {

  taskId : string;
  path : () => string | null;
  type : 'base64' | 'path' | 'utf8';
  data : any;
  blob : (contentType:string, sliceSize:number) => Promise<Blob>;
  text : () => string | Promise<any>;
  json : () => any;
  base64 : () => any;
  flush : () => void;
  respInfo : RNFetchBlobResponseInfo;
  session : (name:string) => RNFetchBlobSession | null;
  readFile : (encode: 'base64' | 'utf8' | 'ascii') => ?Promise<any>;
  readStream : (
    encode: 'utf8' | 'ascii' | 'base64',
  ) => RNFetchBlobStream | null;

  constructor(taskId:string, info:RNFetchBlobResponseInfo, data:any) {
    this.data = data
    this.taskId = taskId
    this.type = info.rnfbEncode
    this.respInfo = info

    this.info = ():RNFetchBlobResponseInfo => {
      return this.respInfo
    }
    /**
     * Convert result to javascript RNFetchBlob object.
     * @return {Promise<Blob>} Return a promise resolves Blob object.
     */
    this.blob = ():Promise<Blob> => {
      let Blob = polyfill.Blob
      let cType = info.headers['Content-Type'] || info.headers['content-type']
      return new Promise((resolve, reject) => {
        switch(this.type) {
          case 'base64':
            Blob.build(this.data, { type : cType + ';BASE64' }).then(resolve)
          break
          case 'path':
            polyfill.Blob.build(wrap(this.data), { type : cType }).then(resolve)
          break
          default:
            polyfill.Blob.build(this.data, { type : 'text/plain' }).then(resolve)
          break
        }
      })
    }
    /**
     * Convert result to text.
     * @return {string} Decoded base64 string.
     */
    this.text = ():string | Promise<any> => {
      let res = this.data
      switch(this.type) {
        case 'base64':
          return base64.decode(this.data)
        case 'path':
          return fs.readFile(this.data, 'base64').then((b64) => Promise.resolve(base64.decode(b64)))
        default:
          return this.data
      }
    }
    /**
     * Convert result to JSON object.
     * @return {object} Parsed javascript object.
     */
    this.json = ():any => {
      switch(this.type) {
        case 'base64':
          return JSON.parse(base64.decode(this.data))
        case 'path':
          return fs.readFile(this.data, 'utf8')
                   .then((text) => Promise.resolve(JSON.parse(text)))
        default:
          return JSON.parse(this.data)
      }
    }
    /**
     * Return BASE64 string directly.
     * @return {string} BASE64 string of response body.
     */
    this.base64 = ():string | Promise<any> => {
      switch(this.type) {
        case 'base64':
          return this.data
        case 'path':
          return fs.readFile(this.data, 'base64')
        default:
          return base64.encode(this.data)
      }
    }
    /**
     * Remove cahced file
     * @return {Promise}
     */
    this.flush = () => {
      let path = this.path()
      if(!path || this.type !== 'path')
        return
      return unlink(path)
    }
    /**
     * get path of response temp file
     * @return {string} File path of temp file.
     */
    this.path = () => {
      if(this.type === 'path')
        return this.data
      return null
    }

    this.session = (name:string):RNFetchBlobSession | null => {
      if(this.type === 'path')
        return session(name).add(this.data)
      else {
        console.warn('only file paths can be add into session.')
        return null
      }
    }
    /**
     * Start read stream from cached file
     * @param  {String} encoding Encode type, should be one of `base64`, `ascrii`, `utf8`.
     * @param  {Function} fn On data event handler
     * @return {void}
     */
    this.readStream = (encode: 'base64' | 'utf8' | 'ascii'):RNFetchBlobStream | null => {
      if(this.type === 'path') {
        return readStream(this.data, encode)
      }
      else {
        console.warn('RNFetchblob', 'this response data does not contains any available stream')
        return null
      }
    }
    /**
     * Read file content with given encoding, if the response does not contains
     * a file path, show warning message
     * @param  {String} encoding Encode type, should be one of `base64`, `ascrii`, `utf8`.
     * @return {String}
     */
    this.readFile = (encode: 'base64' | 'utf8' | 'ascii') => {
      if(this.type === 'path') {
        encode = encode || 'utf8'
        return readFile(this.data, encode)
      }
      else {
        console.warn('RNFetchblob', 'this response does not contains a readable file')
        return null
      }
    }
  }

}

export default {
  fetch,
  base64,
  android,
  config,
  session,
  fs,
  wrap,
  polyfill
}
