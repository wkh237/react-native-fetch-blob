/**
 * @name react-native-fetch-blob-fs
 * @author wkh237
 * @version 0.1.0
 * @flow
 */

import {
  NativeModules,
  DeviceEventEmitter,
  NativeAppEventEmitter,
} from 'react-native'
import type {
  RNFetchBlobNative,
  RNFetchBlobConfig,
  RNFetchBlobStream
} from './types'

const RNFetchBlob:RNFetchBlobNative = NativeModules.RNFetchBlob
const emitter = DeviceEventEmitter

// session table
let sessions = {}

/**
 * Get path of system directories.
 * @return {object} Map contains DocumentDir, CacheDir, DCIMDir, DownloadDir,
 * , some directory might not be supported by platform.
 */
function getSystemDirs() {
  return new Promise((resolve, reject) => {
    try {
      RNFetchBlob.getEnvironmentDirs((...dirs) => {
        let [DocumentDir, CacheDir, DCIMDir, DownloadDir] = [...dirs]
        resolve({DocumentDir, CacheDir, DCIMDir, DownloadDir})
      })
    } catch(err) {
      reject(err)
    }
  })
}

/**
 * Get a file cache session
 * @param  {[type]} name:string [description]
 * @return {[type]}             [description]
 */
function session(name:string):RNFetchBlobSession {
  let s = sessions[name]
  if(s)
    return new RNFetchBlobSession(name)
  else {
    sessions[name] = []
    return new RNFetchBlobSession(name, [])
  }
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
):Promise<WriteStream> {
  if(!path)
    throw Error('RNFetchBlob could not open file stream with empty `path`')
  encoding = encoding || 'base64'
  return new Promise((resolve, reject) => {
    RNFetchBlob.writeStream(path, encoding || 'base64', append || false, (err, streamId:string) => {
      if(err)
        reject(err)
      else
        resolve(new WriteStream(streamId))
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
  bufferSize? : ?number
):RNFetchBlobStream {

  if(!path)
    throw Error('RNFetchBlob could not open file stream with empty `path`')

  let stream:RNFetchBlobStream = {
    onData : function(fn) {
      this._onData = fn
    },
    onError : function(fn) {
      this._onError = fn
    },
    onEnd : function(fn) {
      this._onEnd = fn
    },
  }

  // register for file stream event
  let subscription = emitter.addListener(`RNFetchBlobStream+${path}`, (e) => {

    let {event, detail} = e
    if(stream._onData && event === 'data')
      stream._onData(detail)
    else if (stream._onEnd && event === 'end') {
      stream._onEnd(detail)
    }
    else {
      stream._onError(detail)
    }
    // when stream closed or error, remove event handler
    if (event === 'error' || event === 'end') {
      subscription.remove()
    }
  })

  RNFetchBlob.readStream(path, encoding, bufferSize || 0)
  return stream

}

function mkdir(path:string):Promise {

  return new Promise((resolve, reject) => {
    RNFetchBlob.mkdir(path, (err, res) => {
      if(err)
        reject(err)
      else
        resolve(res)
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
    RNFetchBlob.ls(path, dest, (err, res) => {
      if(err)
        reject(err)
      else
        resolve(res)
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
      RNFetchBlob.exists(path, (exist, isDir) => {
        resolve(exist, isDir)
      })
    } catch(err) {
      reject(err)
    }
  })

}

/**
 * Session class
 * @class RNFetchBlobSession
 */
class RNFetchBlobSession {

  add : (path:string) => RNFetchBlobSession;
  remove : (path:string) => RNFetchBlobSession;
  dispose : () => Promise;
  list : () => Array<string>;
  name : string;

  constructor(name:string, list:Array<string>) {
    this.name = name
    if(!sessions[name]) {
      if(Array.isArray(list))
      sessions[name] = list
      else
      sessions[name] = []
    }
  }

  add(path:string):RNFetchBlobSession {
    sessions[this.name].push(path)
    return this
  }

  remove(path:string):RNFetchBlobSession {
    let list = sessions[this.name]
    for(let i in list) {
      if(list[i] === path) {
        sessions[this.name].splice(i, 1)
        break;
      }
    }
    return this
  }

  list():Array<string> {
    return sessions[this.name]
  }

  dispose():Promise {
    return new Promise((resolve, reject) => {
      RNFetchBlob.removeSession(sessions[this.name], (err) => {
        if(err)
          reject(err)
        else {
          delete sessions[this.name]
          resolve()
        }
      })
    })
  }

}

class WriteStream {

  id : string;
  encoding : string;
  append : bool;

  constructor(streamId:string, encoding:string, append:string) {
    this.id = streamId
    this.encoding = encoding
    this.append = append
  }

  write() {
    return new Promise((resolve, reject) => {
      try {
        RNFetchBlob.writeChunk(this.id, data, (error) => {
          if(error)
            reject(error)
          else
            resolve()
        })
      } catch(err) {
        reject(err)
      }
    })
  }

  close() {
    return new Promise((resolve, reject) => {
      try {
        RNFetchBlob.closeStream(this.id, () => {
          resolve()
        })
      } catch (err) {
        reject(err)
      }
    })
  }

}

export default {
  RNFetchBlobSession, unlink, mkdir, session, ls, readStream, getSystemDirs, mv, cp
}
