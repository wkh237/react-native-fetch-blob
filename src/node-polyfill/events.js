// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.
// @flow
import Log from '../utils/log'
import EventEmitter from 'eventemitter3'
const log = new Log('node-event')

log.level(3)
log.info('polyfill loaded')

// class EventEmitter {
//
//   static defaultMaxListeners:number = 10;
//
//   static listenerCount(emitter:EventEmitter, eventName:string):number {
//     return emitter._listeners ? emitter._listeners.length : 0
//   }
//
//   constructor() {
//     log.verbose('new EventEmitter created')
//     this._emitter = new ee()
//   }
//
//   emit() {
//
//   }
//
//
// }


// since nodejs modules uses es5 export by default, we should use es5 export here
export {
  EventEmitter
}
