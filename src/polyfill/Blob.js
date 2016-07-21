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
  _onCreated:Array<any> = [];

  static Instances:any = {}

  // legacy constructor
  constructor(data:any, mime:?string) {

    this.cacheName = getBlobName()
    this.isRNFetchBlobPolyfill = true
    this.type = mime
    log.verbose('Blob constructor called', 'mime', mime)
    this._ref = blobCacheDir + this.cacheName
    let p = null
    // content from file
    if(typeof data === 'string' && data.startsWith('RNFetchBlob-file://')) {
      log.verbose('create Blob cache file from file path')
      this._ref = data
      p = Promise.resolve()
    }
    // content from variable need create file
    else if(typeof data === 'string') {
      log.verbose('create Blob cache file from string')
      let encoding = 'utf8'
      if(String(mime).match('application/octet'))
        encoding = 'base64'
      else if(Array.isArray(data))
        encoding = 'ascii'
      // create cache file
      p = fs.writeFile(this._ref, data, encoding)

    }
    // when input is an array of mixed data types, create a file cache
    else if(Array.isArray(data)) {
      log.verbose('create Blob cache file from mixed array', data)
      p = createMixedBlobData(this._ref, data)
    }
    p && p.then(() => {
      this._invokeOnCreateEvent()
    })
    .catch((err) => {
      log.error('RNFetchBlob cannot create Blob : '+ this._ref)
    })

  }

  onCreated(fn:() => void) {
    log.verbose('register blob onCreated', this._onCreated.length)
    this._onCreated.push(fn)
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

  clearCache() {

  }

  _invokeOnCreateEvent() {
    log.verbose('invoke create event')
    this._blobCreated = true
    let fns = this._onCreated
    for(let i in fns) {
      if(typeof fns[i] === 'function')
        fns[i](this)
    }
    delete this._onCreated
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
  let p = fs.writeFile(ref, '')
  let args = []
  for(let i in dataArray) {
    let part = dataArray[i]
    if(part instanceof Blob)
      args.push([ref, part.getRNFetchBlobRef(), 'uri'])
    else if(typeof part === 'string')
      args.push([ref, part, 'utf8'])
    else if (Array.isArray(part))
      args.push([ref, part, 'ascii'])
  }
  return p.then(() => {
    let promises = args.map((p) => {
      return fs.appendFile.call(this, ...p)
    })
    return Promise.all(promises)
  })
}
