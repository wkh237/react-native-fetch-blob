import { NativeModules } from 'react-native';

const RNFetchBlob = NativeModules.RNFetchBlob

// Promise wrapper function
const fetch = (...args) => new Promise((resolve, reject) => {

  let [method, url, headers, body] = [...args]

  RNFetchBlob.fetchBlob(method, url, headers, body, (err, data) => {
    if(err)
      reject(new Error(err, data))
    else
      resolve(new FetchBlobResponse(data))
  })


})

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
      return b64toBlob(this.data, contentType, sliceSize)
    }
    /**
     * Convert result to text.
     * @return {string} Decoded base64 string.
     */
    this.text = () => {
      return atob(this.data)
    }
    /**
     * Convert result to JSON object.
     * @return {object} Parsed javascript object.
     */
    this.json = () => {
      return JSON.parse(atob(this.data))
    }
    this.base64 = () => {
      return this.data
    }

  }

}

/**
 * Convert base64 string to blob, source : StackOverflow
 * {@link http://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript}
 * @param  {string} b64Data     Base64 string of data.
 * @param  {string} contentType MIME type of data.
 * @param  {number} sliceSize   Slice size, default to 512.
 * @return {blob}             Return Blob object.
 */
function b64toBlob(b64Data, contentType, sliceSize) {
  contentType = contentType || '';
  sliceSize = sliceSize || 512;

  var byteCharacters = atob(b64Data);
  var byteArrays = [];

  for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    var slice = byteCharacters.slice(offset, offset + sliceSize);

    var byteNumbers = new Array(slice.length);
    for (var i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    var byteArray = new Uint8Array(byteNumbers);

    byteArrays.push(byteArray);
  }

  var blob = new Blob(byteArrays, {type: contentType});
  return blob;
}

export default {
  fetch, FetchBlobResponse
}
