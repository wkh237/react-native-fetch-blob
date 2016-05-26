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

import base64 from 'base-64'
const emitter = (Platform.OS === 'android' ? DeviceEventEmitter : NativeAppEventEmitter)
const RNFetchBlob = NativeModules.RNFetchBlob

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

type fetchConfig = {
  fileCache : bool,
  path : string,
}

const config = function(options) {
  return { fetch : fetch.bind(options) }
}

// Promise wrapper function
const fetch = function(...args:any) {

  let options = this || {}

  // create task ID for receiving progress event
  let taskId = getUUID()

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
        if(options.fileCache || options.path)
          respType = 'path'
        resolve(new FetchBlobResponse(taskId, respType,...data))
      }

    })

  })

  promise.progress = (fn) => {
    promise.onProgress = fn
    return promise
  }

  return promise

}

/**
 * RNFetchBlob response object class.
 */
class FetchBlobResponse {

  taskId : string;
  type : 'base64' | 'path';
  data : any;
  blob : (contentType:string, sliceSize:number) => null;
  text : () => string;
  json : () => any;
  base64 : () => any;
  flush : () => void;
  readStream : (
    encode: 'utf8' | 'ascii' | 'base64',
    fn:(event : 'data' | 'end', chunk:any) => void
  ) => void;

  constructor(taskId:string, type:'base64' | 'path',data:any) {
    this.data = data
    this.taskId = taskId
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
      RNFetchBlob.flush(this.taskId)
    }

    /**
     * Start read stream from cached file
     * @param  {String} encoding Encode type, should be one of `base64`, `ascrii`, `utf8`.
     * @param  {Function} fn On data event handler
     * @return {void}
     */
    this.readStream = (encode: 'base64' | 'utf8' | 'ascii', fn) => {

      // register for file stream event
      let subscription = emitter.addListener(`RNFetchBlobStream${this.taskId}`, (event, chunk) => {
        fn(event, chunk)
        // when stream closed, remove event handler
        if(event === 'end')
          subscription()
      })

      RNFetchBlob.readStream(this.taskId, encode)
    }

  }

}

function getUUID(){
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    let r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

export default {
  fetch, FetchBlobResponse, base64
}
