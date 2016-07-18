/**
 * @author wkh237
 * @since 2016/07/18
 * @description
 * Web API Blob object polyfill.
 */
import fs from '../fs.js'
import getUUID from '../utils/uuid'

export default class Blob {

  cacheName:string;
  type:string;
  size:number;

  // legacy constructor
  constructor(data:any, mime:?string) {
    this.cacheName = getBlobName()
    this.type = mime

    let encode = 'utf8'
    // plain text content
    if(mime === 'text/plain') {
      this.size = data ? data.length : 0
    }
    else if(typeof data === 'string') {
      // content from file
      if(data.startsWith('RNFetchBlob-file://')) {
        encode = 'uri'
      }
      // BASE64 encoded
      else {
        encode = 'base64'
      }
    }
    // create cache entry for Blob object
    fs.createFile(this.cacheName, data, encode)
  }

  /**
   * Write data to Blob object
   * @param  {string | Array} data Data that will write to Blob object
   * @param  {string} encoding Encoding of data to be written
   * @return {Promise}
   */
  write(data:string | Array<number>, encoding:'base64' | 'utf8' | 'ascii' | 'uri'):Promise {
    return fs.write(this.cacheName, data, encoding)
  }

  /**
   * Create a Blob object which is sliced from current object
   * @param  {number} start    Start byte number
   * @param  {number} end      End byte number
   * @param  {string} contentType Optional, content type of new Blob object
   * @return {Blob}
   */
  slice(start:?number, end:?number, encoding:?string):Blob {
    console.log('slice called')
    return fs.slice(this.cacheName, getBlobName(), contentType, start, end)
  }

  /**
   * Release the resource of the Blob object.
   * @nonstandard
   * @return {Promise}
   */
  close() {
    fs.unlink(this.cacheName)
  }


}

/**
 * Get a temp filename for Blob object
 * @return {string} Temporary filename
 */
function getBlobName() {
  return 'blob-' + getUUID()
}
