// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.

import RNFetchBlob from '../index.js'
import fs from '../fs.js'
import getUUID from '../utils/uuid'
import Log from '../utils/log.js'

const log = new Log('Blob')
const blobCacheDir = fs.dirs.DocumentDir + '/RNFetchBlob-blobs/'

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

  /**
   * Static method that remove all files in Blob cache folder.
   * @nonstandard
   * @return {Promise}
   */
  static clearCache() {
    return fs.unlink(blobCacheDir).then(() => fs.mkdir(blobCacheDir))
  }

  /**
   * RNFetchBlob Blob polyfill, create a Blob directly from file path, BASE64
   * encoded data, and string. The conversion is done implicitly according to
   * given `mime`. However, the blob creation is asynchronously, to register
   * event `onCreated` is need to ensure the Blob is creadted.
   * @param  {any} data Content of Blob object
   * @param  {any} mime Content type settings of Blob object, `text/plain`
   *                    by default
   */
  constructor(data:any, cType:any) {
    cType = cType || {}
    this.cacheName = getBlobName()
    this.isRNFetchBlobPolyfill = true
    this.type = cType.type || 'text/plain'
    log.verbose('Blob constructor called', 'mime', this.type, 'type', typeof data, 'length', data.length)
    this._ref = blobCacheDir + this.cacheName
    let p = null
    if(data instanceof Blob) {
      log.verbose('create Blob cache file from Blob object')
      let size = 0
      this._ref = String(data.getRNFetchBlobRef())
      let orgPath = this._ref
      p = fs.exists(orgPath)
            .then((exist) =>  {
              if(exist)
                return fs.writeFile(orgPath, data, 'uri')
                         .then((size) => Promise.resolve(size))
                         .catch((err) => {
                           throw `RNFetchBlob Blob file creation error, ${err}`
                         })
              else
                throw `could not create Blob from path ${orgPath}, file not exists`
            })
    }
    // if the data is a string starts with `RNFetchBlob-file://`, append the
    // Blob data from file path
    else if(typeof data === 'string' && data.startsWith('RNFetchBlob-file://')) {
      log.verbose('create Blob cache file from file path', data)
      this._ref = String(data).replace('RNFetchBlob-file://', '')
      let orgPath = this._ref
      p = fs.stat(orgPath)
            .then((stat) =>  {
                return Promise.resolve(stat.size)
            })
    }
    // content from variable need create file
    else if(typeof data === 'string') {
      let encoding = 'utf8'
      let mime = String(this.type)
      // when content type contains application/octet* or *;base64, RNFetchBlob
      // fs will treat it as BASE64 encoded string binary data
      if(/(application\/octet|\;base64)/i.test(mime))
        encoding = 'base64'
      else
        data = data.toString()
      // create cache file
      log.verbose('create Blob cache file from string', 'encode', encoding)
      p = fs.writeFile(this._ref, data, encoding)
            .then((size) => Promise.resolve(size))

    }
    // TODO : ArrayBuffer support
    // else if (data instanceof ArrayBuffer ) {
    //
    // }
    // when input is an array of mixed data types, create a file cache
    else if(Array.isArray(data)) {
      log.verbose('create Blob cache file from mixed array', data)
      p = createMixedBlobData(this._ref, data)
    }
    else {
      data = data.toString()
      p = fs.writeFile(this._ref, data, 'utf8')
            .then((size) => Promise.resolve(size))
    }
    p && p.then((size) => {
      this.size = size
      this._invokeOnCreateEvent()
    })
    .catch((err) => {
      log.error('RNFetchBlob could not create Blob : '+ this._ref, err)
    })

  }

  /**
   * Since Blob content will asynchronously write to a file during creation,
   * use this method to register an event handler for Blob initialized event.
   * @nonstandard
   * @param  {[type]} fn:( [description]
   * @return {[type]}      [description]
   */
  onCreated(fn:() => void) {
    log.verbose('register blob onCreated', this._onCreated.length)
    this._onCreated.push(fn)
  }

  /**
   * Get file reference of the Blob object.
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
    // TODO : fs.slice
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
  let size = 0
  for(let i in dataArray) {
    let part = dataArray[i]
    if(part instanceof Blob)
      args.push([ref, part.getRNFetchBlobRef(), 'uri'])
    else if(typeof part === 'string')
      args.push([ref, part, 'utf8'])
    // TODO : ArrayBuffer
    // else if (part instanceof ArrayBuffer) {
    //
    // }
    else if (Array.isArray(part))
      args.push([ref, part, 'ascii'])
  }
  return p.then(() => {
    let promises = args.map((p) => {
      log.verbose('mixed blob write', ...p)
      return fs.appendFile.call(this, ...p)
    })
    return Promise.all(promises).then((sizes) => {
      console.log('blob write size', sizes)
      for(let i in sizes) {
        size += sizes[i]
      }
      return Promise.resolve(size)
    })
  })
}
