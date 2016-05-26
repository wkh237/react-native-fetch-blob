/**
 * @author wkh237
 * @version 0.4.2
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

// Show warning if native module not detected
if(!RNFetchBlob || !RNFetchBlob.fetchBlobForm || !RNFetchBlob.fetchBlob) {
  console.warn(
    'react-native-fetch-blob could not find valid native module.',
    'please make sure you have linked native modules using `rnpm link`,',
    'and restart RN packager or manually compile IOS/Android project.'
  )
}

const config = function(options) {
  return { fetch : fetch.bind(options) }
}

// Promise wrapper function
const fetch = function(...args) {

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
    req(taskId, method, url, headers || {}, body, (err, ...data) => {

      // task done, remove event listener
      subscription.remove()
      if(err)
        reject(new Error(err, ...data))
      else
        resolve(new FetchBlobResponse(...data))

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

  constructor(data) {
    this.data = data
    /**
     * Convert result to javascript Blob object.
     * @param  {string} contentType MIME type of the blob object.
     * @param  {number} sliceSize   Slice size.
     * @return {blob}             Return Blob object.
     */
    this.blob = (contentType, sliceSize) => {
      console.warn('FetchBlobResponse.blob() is deprecated and has no funtionality.')
      return null
    }
    /**
     * Convert result to text.
     * @return {string} Decoded base64 string.
     */
    this.text = () => {
      return base64.decode(this.data)
    }
    /**
     * Convert result to JSON object.
     * @return {object} Parsed javascript object.
     */
    this.json = () => {
      return JSON.parse(base64.decode(this.data))
    }
    /**
     * Return BASE64 string directly.
     * @return {string} BASE64 string of response body.
     */
    this.base64 = () => {
      return this.data
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
