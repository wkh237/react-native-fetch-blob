/**
 * @author wkh237
 * @version 0.3.3
 */

import { NativeModules } from 'react-native'
import base64 from 'base-64'

const RNFetchBlob = NativeModules.RNFetchBlob

// Show warning if native module not detected
if(RNFetchBlob === void 0) {
  console.warn(
    'react-native-fetch-blob could not find native module.',
    'please make sure you have linked native modules using `rnpm link`,',
    'and restart RN packager or manually compile IOS/Android project.'
  )
}

// Promise wrapper function
const fetch = (...args) => {

  let promise = new Promise((resolve, reject) => {

    let [method, url, headers, body] = [...args]
    let nativeMethodName = Array.isArray(body) ? 'fetchBlobForm' : 'fetchBlob'

    RNFetchBlob[nativeMethodName](method, url, headers || {}, body, (err, ...data) => {
      if(err)
        reject(new Error(err, ...data))
      else
        resolve(new FetchBlobResponse(...data))
    })

  })

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

export default {
  fetch, FetchBlobResponse, base64
}
