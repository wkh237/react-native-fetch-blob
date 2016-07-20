// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.

import RNFetchBlob from '../index.js'
import fs from '../fs.js'
import getUUID from '../utils/uuid'

const blobCacheDir = fs.dirs.DocumentDir + '/RNFetchBlob-blob/'

/**
 * A RNFetchBlob style Blob polyfill class, this is a Blob which compatible to
 * Response object attain fron RNFetchBlob.fetch.
 */
export default class Blob {

  cacheName:string;
  type:string;
  size:number;

  _ref:string = null;
  _blobCreated:boolean = false;
  _onCreated:() => void;

  static Instances:any = {}

  // legacy constructor
  constructor(data:any, mime:?string) {
    this.cacheName = getBlobName()
    this.type = mime
    if(typeof data === 'string') {
      // content from file
      if(data.startsWith('RNFetchBlob-file://')) {
        this._ref = data
        this._blobCreated = true
      }
      // content from variable need create file
      else {
        this._ref = RNFetchBlob.wrap(blobCacheDir + this.cacheName)
        let encoding = 'utf8'
        if(typeof data === 'string' && String(mime).match('application/octet') )
          encoding = 'base64'
        else if(Array.isArray(data))
          encoding = 'ascii'

        this.init(data, encoding)
          .then(() => {
            if(typeof this._onCreated === 'function')
              this._onCreated()
            _blobCreated = true
          })
          .catch((err) => {
            console.log('RNFetchBlob cannot create Blob', err)
          })
      }
    }
    else {
      console.log('TODO')
    }
  }

  onCreated(fn:() => void) {
    console.log('register blob onCreated', fn)
    if(this._blobCreated)
      fn()
    else
      this._onCreated = fn
  }

  /**
   * Create blob file cache
   * @nonstandard
   * @param  {string | Array} data Data to create Blob file
   * @param  {'base64' | 'utf8' | 'ascii'} encoding RNFetchBlob fs encoding
   * @return {Promise}
   */
  init(data, encoding):Promise {
    console.log('blob init called')
    return fs.exists(blobCacheDir).then((exist) => {
      if(!exist)
        return fs.mkdir(blobCacheDir).then(() => fs.createFile(this._ref, data, encoding))
      else
        return fs.createFile(this._ref, data, encoding)
    })
  }

  /**
   * @nonstandard
   * @return {string} Blob file reference which can be consumed by RNFetchBlob fs
   */
  getRNFetchBlobRef() {
    return this._ref
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
    // return fs.slice(this.cacheName, getBlobName(), contentType, start, end)
  }

  /**
   * Release the resource of the Blob object.
   * @nonstandard
   * @return {Promise}
   */
  close() {
    return fs.unlink(this._ref)
  }


}

/**
 * Get a temp filename for Blob object
 * @return {string} Temporary filename
 */
function getBlobName() {
  return 'blob-' + getUUID()
}
