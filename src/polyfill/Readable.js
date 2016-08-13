// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.

import RNFetchBlob from '../index.js'
import fs from '../fs.js'
import getUUID from '../utils/uuid'
import Log from '../utils/log.js'
import Stream from './Stream.js'
import EventEmitter from 'EventEmitter'

const log = new Log('Readable')

// log.disable()
log.level(3)

/**
 * A RNFetchBlob style nodejs ReadableStream polyfill class
 */
export default class Readable {

  constructor() {

    this._emitter = new EventEmitter()
    this._encoding = 'utf8'
    this._readableState = null
    this._isPaused = true

  }

  pipe(stream:Readable):Readable {
    this._emitter.addListener('data', (chunk) => {
      stream.emit('data', chunk)
    })
  }

  unpipe(stream:Readable, options:any):Readable {

  }

  setEncoding(encoding:'utf8' | 'base64' | 'ascii'):Readable {
    this._encoding = encoding
  }

  resume():Readable {
    this._readableState = true
  }

  read(size:number) {

  }

  isPaused():boolean {
    return this._isPaused
  }

  pause():Readable {
    this._readableState = false
    return this
  }

  emit(event:string, data:any):Readable {
    this._emitter.emit(event, data)
    return this
  }

  on(event:string, fn:() => void):Readable {
    this._emitter.addListener(event, fn)
    return this
  }

  unshift(chunk:any):Readable {

  }

  wrap(stream:Stream) {

  }

}
