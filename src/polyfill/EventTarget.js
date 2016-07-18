// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.

export default class EventTarget {

  listeners : any;

  constructor() {
    this.listeners = {}
  }

  addEventListener(type:string, cb : () => void) {
    if(!(type in this.listeners)) {
      this.listeners[type] = []
    }
    this.listeners[type].push(cb)
  }

  removeEventListener(type:string, cb:() => any) {
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
    if(!(event.type in this.listeners))
      return
    let handlers = this.listeners[event.type]
    for(let i in handlers) {
      handlers[i].call(this, event)
    }

  }

}
