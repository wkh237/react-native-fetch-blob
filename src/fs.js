// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.
// @flow

import {
  NativeModules,
  DeviceEventEmitter,
  Platform,
  NativeAppEventEmitter,
} from 'react-native'
import RNFetchBlobSession from './class/RNFetchBlobSession'
import RNFetchBlobWriteStream from './class/RNFetchBlobWriteStream'
import RNFetchBlobReadStream from './class/RNFetchBlobReadStream'
import RNFetchBlobFile from './class/RNFetchBlobFile'
import type {
  RNFetchBlobNative,
  RNFetchBlobConfig,
  RNFetchBlobStream
} from './types'

const RNFetchBlob:RNFetchBlobNative = NativeModules.RNFetchBlob
const emitter = DeviceEventEmitter
const dirs = {
    DocumentDir :  RNFetchBlob.DocumentDir,
    CacheDir : RNFetchBlob.CacheDir,
    PictureDir : RNFetchBlob.PictureDir,
    MusicDir : RNFetchBlob.MusicDir,
    MovieDir : RNFetchBlob.MovieDir,
    DownloadDir : RNFetchBlob.DownloadDir,
    DCIMDir : RNFetchBlob.DCIMDir
}

/**
 * Get a file cache session
 * @param  {string} name Stream ID
 * @return {RNFetchBlobSession}
 */
function session(name:string):RNFetchBlobSession {
  let s = RNFetchBlobSession.getSession(name)
  if(s)
    return new RNFetchBlobSession(name)
  else {
    RNFetchBlobSession.setSession(name, [])
    return new RNFetchBlobSession(name, [])
  }
}

function asset(path:string):string {
  if(Platform.OS === 'ios') {
    // path from camera roll
    if(/^assets-library\:\/\//.test(path))
      return path
  }
  return 'bundle-assets://' + path
}

function createFile(path:string, data:string, encoding: 'base64' | 'ascii' | 'utf8'):Promise {
  encoding = encoding || 'utf8'
  return new Promise((resolve, reject) => {
    let handler = (err) => {
      if(err)
      reject(err)
      else
      resolve()
    }
    if(encoding.toLowerCase() === 'ascii') {
      if(Array.isArray(data))
        RNFetchBlob.createFileASCII(path, data, handler)
      else
        reject('`data` of ASCII file must be an array contains numbers')
    }
    else {
      RNFetchBlob.createFile(path, data, encoding, handler)
    }
  })
}

/**
 * Create write stream to a file.
 * @param  {string} path Target path of file stream.
 * @param  {string} encoding Encoding of input data.
 * @param  {bool} append  A flag represent if data append to existing ones.
 * @return {Promise<WriteStream>} A promise resolves a `WriteStream` object.
 */
function writeStream(
  path : string,
  encoding : 'utf8' | 'ascii' | 'base64',
  append? : ?bool,
):Promise<RNFetchBlobWriteStream> {
  if(!path)
    throw Error('RNFetchBlob could not open file stream with empty `path`')
  encoding = encoding || 'utf8'
  append = append || false
  return new Promise((resolve, reject) => {
    RNFetchBlob.writeStream(path, encoding || 'base64', append || false, (err, streamId:string) => {
      if(err)
        reject(err)
      else
        resolve(new RNFetchBlobWriteStream(streamId, encoding))
    })
  })
}

/**
 * Create file stream from file at `path`.
 * @param  {string} path   The file path.
 * @param  {string} encoding Data encoding, should be one of `base64`, `utf8`, `ascii`
 * @param  {boolean} bufferSize Size of stream buffer.
 * @return {RNFetchBlobStream} RNFetchBlobStream stream instance.
 */
function readStream(
  path : string,
  encoding : 'utf8' | 'ascii' | 'base64',
  bufferSize? : ?number,
  tick : ?number = 10
):Promise<RNFetchBlobReadStream> {
  return Promise.resolve(new RNFetchBlobReadStream(path, encoding, bufferSize, tick))
}

/**
 * Create a directory.
 * @param  {string} path Path of directory to be created
 * @return {Promise}
 */
function mkdir(path:string):Promise {

  return new Promise((resolve, reject) => {
    RNFetchBlob.mkdir(path, (err, res) => {
      if(err)
        reject(err)
      else
        resolve()
    })
  })

}

/**
 * Wrapper method of readStream.
 * @param  {string} path Path of the file.
 * @param  {'base64' | 'utf8' | 'ascii'} encoding Encoding of read stream.
 * @return {Promise<Array<number> | string>}
 */
function readFile(path:string, encoding:string, bufferSize:?number):Promise<any> {
  if(typeof path !== 'string')
    return Promise.reject('Invalid argument "path" ')
  return RNFetchBlob.readFile(path, encoding)
}

/**
 * Write data to file.
 * @param  {string} path  Path of the file.
 * @param  {string | number[]} data Data to write to the file.
 * @param  {string} encoding Encoding of data (Optional).
 * @return {Promise}
 */
function writeFile(path:string, data:string | Array<number>, encoding:?string):Promise {
  encoding = encoding || 'utf8'
  if(typeof path !== 'string')
    return Promise.reject('Invalid argument "path" ')
  if(encoding.toLocaleLowerCase() === 'ascii') {
    if(!Array.isArray(data))
      Promise.reject(`Expected "data" is an Array when encoding is "ascii", however got ${typeof data}`)
    else
      return RNFetchBlob.writeFileArray(path, data, false);
  } else {
    if(typeof data !== 'string')
      Promise.reject(`Expected "data" is a String when encoding is "utf8" or "base64", however got ${typeof data}`)
    else
      return RNFetchBlob.writeFile(path, encoding, data, false);
  }
}

function appendFile(path:string, data:string | Array<number>, encoding:?string):Promise {
  encoding = encoding || 'utf8'
  if(typeof path !== 'string')
    return Promise.reject('Invalid argument "path" ')
  if(encoding.toLocaleLowerCase() === 'ascii') {
    if(!Array.isArray(data))
      Promise.reject(`Expected "data" is an Array when encoding is "ascii", however got ${typeof data}`)
    else
      return RNFetchBlob.writeFileArray(path, data, true);
  } else {
    if(typeof data !== 'string')
      Promise.reject(`Expected "data" is a String when encoding is "utf8" or "base64", however got ${typeof data}`)
    else
      return RNFetchBlob.writeFile(path, encoding, data, true);
  }
}

/**
 * Show statistic data of a path.
 * @param  {string} path Target path
 * @return {RNFetchBlobFile}
 */
function stat(path:string):Promise<RNFetchBlobFile> {
  return new Promise((resolve, reject) => {
    RNFetchBlob.stat(path, (err, stat) => {
      if(err)
        reject(err)
      else
        resolve(stat)
    })
  })
}

/**
 * Android only method, request media scanner to scan the file.
 * @param  {Array<Object<string, string>>} Array contains Key value pairs with key `path` and `mime`.
 * @return {Promise}
 */
function scanFile(pairs:any):Promise {
  return new Promise((resolve, reject) => {
    RNFetchBlob.scanFile(pairs, (err) => {
      if(err)
        reject(err)
      else
        resolve()
    })
  })
}

function cp(path:string, dest:string):Promise<boolean> {
  return new Promise((resolve, reject) => {
    RNFetchBlob.cp(path, dest, (err, res) => {
      if(err)
        reject(err)
      else
        resolve(res)
    })
  })
}

function mv(path:string, dest:string):Promise<boolean> {
  return new Promise((resolve, reject) => {
    RNFetchBlob.mv(path, dest, (err, res) => {
      if(err)
        reject(err)
      else
        resolve(res)
    })
  })
}

function lstat(path:string):Promise<Array<RNFetchBlobFile>> {
  return new Promise((resolve, reject) => {
    RNFetchBlob.lstat(path, (err, stat) => {
      if(err)
        reject(err)
      else
        resolve(stat)
    })
  })
}

function ls(path:string):Promise<Array<String>> {
  return new Promise((resolve, reject) => {
    RNFetchBlob.ls(path, (err, res) => {
      if(err)
        reject(err)
      else
        resolve(res)
    })
  })
}

/**
 * Remove file at path.
 * @param  {string}   path:string Path of target file.
 * @return {Promise}
 */
function unlink(path:string):Promise {
  return new Promise((resolve, reject) => {
    RNFetchBlob.unlink(path, (err) => {
      if(err)
        reject(err)
      else
        resolve()
    })
  })
}

/**
 * Check if file exists and if it is a folder.
 * @param  {string} path Path to check
 * @return {Promise<bool, bool>}
 */
function exists(path:string):Promise<bool, bool> {

  return new Promise((resolve, reject) => {
    try {
      RNFetchBlob.exists(path, (exist) => {
        resolve(exist)
      })
    } catch(err) {
      reject(err)
    }
  })

}

function slice(src:string, dest:string, start:number, end:number):Promise {
  let p = Promise.resolve()
  let size = 0
  function normalize(num, size) {
    if(num < 0)
      return Math.max(0, size + num)
    if(!num && num !== 0)
      return size
    return num
  }
  if(start < 0 || end < 0 || !start || !end) {
    p = p.then(() => stat(src))
         .then((stat) => {
           size = Math.floor(stat.size)
           start = normalize(start || 0, size)
           end = normalize(end, size)
           return Promise.resolve()
         })
  }
  return p.then(() => RNFetchBlob.slice(src, dest, start, end))
}

function isDir(path:string):Promise<bool, bool> {

  return new Promise((resolve, reject) => {
    try {
      RNFetchBlob.exists(path, (exist, isDir) => {
        resolve(isDir)
      })
    } catch(err) {
      reject(err)
    }
  })

}

export default {
  RNFetchBlobSession,
  unlink,
  mkdir,
  session,
  ls,
  readStream,
  mv,
  cp,
  writeStream,
  writeFile,
  appendFile,
  readFile,
  exists,
  createFile,
  isDir,
  stat,
  lstat,
  scanFile,
  dirs,
  slice,
  asset
}
