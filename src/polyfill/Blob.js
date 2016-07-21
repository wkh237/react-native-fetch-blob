// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.

import RNFetchBlob from '../index.js'
import fs from '../fs.js'
import getUUID from '../utils/uuid'
import Log from '../utils/log.js'

const log = new Log('Blob')
const blobCacheDir = fs.dirs.DocumentDir + '/RNFetchBlob-blob/'

log.level(3)

/**
 * A RNFetchBlob style Blob polyfill class, this is a Blob which compatible to
 * Response object attain fron RNFetchBlob.fetch.
 */
export default class Blob {

  cacheName:string;
  type:string;
  size:number;
  isRNFetchBlobPolyfill:boolean = true;

  _ref:string = null;
  _blobCreated:boolean = false;
  _onCreated:() => void;

  static Instances:any = {}

  // legacy constructor
  constructor(data:any, mime:?string) {

    this.cacheName = getBlobName()
    this.isRNFetchBlobPolyfill = true
    this.type = mime
    log.verbose('Blob constructor called' , data, 'mime', mime)

    if(typeof data === 'string') {
      // content from file
      if(data.startsWith('RNFetchBlob-file://')) {
        this._ref = data
        this._blobCreated = true
        if(typeof this._onCreated === 'function')
          this._onCreated(this)
      }
      // content from variable need create file
      else {
        log.verbose('create Blob cache file ..')
        this._ref = RNFetchBlob.wrap(blobCacheDir + this.cacheName)
        let encoding = 'utf8'
        if(typeof data === 'string' && String(mime).match('application/octet') )
          encoding = 'base64'
        else if(Array.isArray(data))
          encoding = 'ascii'

        this.init(data, encoding)
            .then(() => {
              log.verbose('init executed ')
              if(typeof this._onCreated === 'function')
                this._onCreated(this)
            })
            .catch((err) => {
              log.error('RNFetchBlob cannot create Blob', err)
            })
      }
    }
    // TODO : handle mixed blob array
    else if(Array.isArray(data)) {
      this._ref = RNFetchBlob.wrap(blobCacheDir + this.cacheName)
      createMixedBlobData(this._ref, data)
        .then(() => {
          if(typeof this._onCreated === 'function')
            this._onCreated(this)
        })
    }

  }

  onCreated(fn:() => void) {
    log.verbose('register blob onCreated')
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
    return new Promise((resolve, reject) => {
      fs.exists(blobCacheDir)
        .then((exist) => {
          log.verbose('blob cache folder exist', blobCacheDir, exist)
          let path = String(this._ref).replace('RNFetchBlob-file://', '')
          log.verbose('create cache file', path)
          if(!exist)
            return fs.mkdir(blobCacheDir)
                     .then(() => fs.createFile(path, data, encoding))
          else
            return fs.createFile(path, data, encoding)
        })
        .then(() => {
          this._blobCreated = true
          resolve()
        })
        .catch((err) => {
          reject(err)
        })
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
    log.verbose('slice called')
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

/**
 * Create a file according to given array. The element in array can be a number,
 * Blob, String, Array.
 * @param  {string} ref File path reference
 * @param  {Array} dataArray An array contains different types of data.
 * @return {Promise}
 */
function createMixedBlobData(ref, dataArray) {
  let p = fs.createFile(ref, '')
  for(let i in dataArray) {
    let part = dataArray[i]
    if(part instanceof Blob)
      p.then(() => fs.appendFile(ref, part.getRNFetchBlobRef()), 'uri')
    else if (Array.isArray(part))
      p.then(() => fs.appendFile(ref), part, 'ascii')
    else
      p.then(() => fs.appendFile(ref), part, 'utf8')
  }
  return p
}
