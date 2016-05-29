/**
 * @author wkh237
 * @version 0.5.0
 * @flow
 */

import {
  NativeModules,
  DeviceEventEmitter,
  NativeAppEventEmitter,
  Platform,
} from 'react-native'
import type {
  RNFetchBlobNative,
  RNFetchBlobConfig,
  RNFetchBlobStream
}from './types'
import base64 from 'base-64'

// const emitter = (Platform.OS === 'android' ? DeviceEventEmitter : NativeAppEventEmitter)
const emitter = DeviceEventEmitter
const RNFetchBlob:RNFetchBlobNative = NativeModules.RNFetchBlob

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

function getSystemDirs() {
  return new Promise((resolve, reject) => {
    try {
      RNFetchBlob.getEnvironmentDirs((...dirs) => {
        let [PictureDir, MovieDir, DocumentDir, CacheDir] = [...dirs]
        resolve({PictureDir, MovieDir, DocumentDir, CacheDir})
      })
    } catch(err) {
      reject(err)
    }
  })

}

function config (options:RNFetchBlobConfig) {
  return { fetch : fetch.bind(options) }
}

// Promise wrapper function
function fetch(...args:any) {

  // create task ID for receiving progress event
  let taskId = getUUID()
  let options = this || {}

  let promise = new Promise((resolve, reject) => {

    let [method, url, headers, body] = [...args]
    let nativeMethodName = Array.isArray(body) ? 'fetchBlobForm' : 'fetchBlob'

    // on progress event listener
    let subscription = emitter.addListener('RNFetchBlobProgress', (e) => {
      if(e.taskId === taskId && promise.onProgress) {
        promise.onProgress(e.written, e.total)
      }
    })

    let req = RNFetchBlob[nativeMethodName]
    req(options, taskId, method, url, headers || {}, body, (err, ...data) => {

      // task done, remove event listener
      subscription.remove()
      if(err)
        reject(new Error(err, ...data))
      else {
        let respType = 'base64'
        if(options.path || options.fileCache)
          respType = 'path'
        resolve(new FetchBlobResponse(taskId, respType, ...data))
      }
    })

  })

  promise.progress = (fn) => {
    promise.onProgress = fn
    return promise
  }

  return promise

}

function openReadStream(path:string, encoding:'utf8' | 'ascii' | 'base64'):RNFetchBlobStream {

  if(!path)
    throw Error('RNFetchBlob could not open file stream with empty `path`')

  let stream:RNFetchBlobStream = {
    onData : function(fn) {
      this._onData = fn
    },
    onError : function(fn) {
      this._onError = fn
    },
    onEnd : function(fn) {
      this._onEnd = fn
    },
  }

  // register for file stream event
  let subscription = emitter.addListener(`RNFetchBlobStream+${path}`, (e) => {
    let {event, detail} = e
    if(stream._onData && event === 'data')
      stream._onData(detail)
    else if (stream._onEnd && event === 'end') {
      stream._onEnd(detail)
    }
    else {
      stream._onError(detail)
    }
    // when stream closed or error, remove event handler
    if (event === 'error' || event === 'end') {
      subscription.remove()
    }

  })

  RNFetchBlob.readStream(path, encoding)

  return stream

}

/**
 * RNFetchBlob response object class.
 */
class FetchBlobResponse {

  taskId : string;
  path : () => string | null;
  type : 'base64' | 'path';
  data : any;
  blob : (contentType:string, sliceSize:number) => null;
  text : () => string;
  json : () => any;
  base64 : () => any;
  flush : () => void;
  readStream : (
    encode: 'utf8' | 'ascii' | 'base64',
  ) => RNFetchBlobStream | null;

  constructor(taskId:string, type:'base64' | 'path', data:any) {
    this.data = data
    this.taskId = taskId
    this.type = type
    /**
     * Convert result to javascript Blob object.
     * @param  {string} contentType MIME type of the blob object.
     * @param  {number} sliceSize   Slice size.
     * @return {blob}             Return Blob object.
     */
    this.blob = (contentType:string, sliceSize:number) => {
      console.warn('FetchBlobResponse.blob() is deprecated and has no funtionality.')
      return null
    }
    /**
     * Convert result to text.
     * @return {string} Decoded base64 string.
     */
    this.text = ():string => {
      return base64.decode(this.data)
    }
    /**
     * Convert result to JSON object.
     * @return {object} Parsed javascript object.
     */
    this.json = ():any => {
      return JSON.parse(base64.decode(this.data))
    }
    /**
     * Return BASE64 string directly.
     * @return {string} BASE64 string of response body.
     */
    this.base64 = ():string => {
      return this.data
    }
    /**
     * Remove cahced file
     * @return {void}
     */
    this.flush = () => {
      RNFetchBlob.flush(this.path())
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
    /**
     * Start read stream from cached file
     * @param  {String} encoding Encode type, should be one of `base64`, `ascrii`, `utf8`.
     * @param  {Function} fn On data event handler
     * @return {void}
     */
    this.readStream = (encode: 'base64' | 'utf8' | 'ascii'):RNFetchBlobStream | null => {
      if(this.type === 'path') {
        return openReadStream(this.data, encode)
      }
      else {
        console.warn('RNFetchblob', 'this response data does not contains any available stream')
        return null
      }
    }

  }

}

function getUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    let r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

export default {
  fetch, base64, config, getSystemDirs, openReadStream
}
