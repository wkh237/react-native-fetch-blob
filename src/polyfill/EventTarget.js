// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.
import Log from '../utils/log.js'

const log = new Log('EventTarget')

export default class EventTarget {

  listeners : any;

  constructor() {
    log.info('constructor called')
    this.listeners = {}
  }

  addEventListener(type:string, cb : () => void) {
    log.info('add event listener', type, cb)
    if(!(type in this.listeners)) {
      this.listeners[type] = []
    }
    this.listeners[type].push(cb)
  }

  removeEventListener(type:string, cb:() => any) {
    log.info('remove event listener', type, cb)
    if(!(type in this.listeners))
      return
    let handlers = this.listeners[type]
    for(let i in handlers) {
      if(cb === handlers[i]) {
        handlers.splice(i,1)
        return this.removeEventListener(type, cb)
      }
    }
  }

  dispatchEvent(event:Event) {
    log.info('dispatch event', event)
    if(!(event.type in this.listeners))
      return
    let handlers = this.listeners[event.type]
    for(let i in handlers) {
      handlers[i].call(this, event)
    }

  }

}
