// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.
// @flow
import Log from '../utils/log'
const log = new Log('node-util')

log.level(1)
log.info('polyfill loaded')

function inherits(ctor, superCtor):any {
  log.verbose('inherits', superCtor, superCtor)
  if(superCtor) {
    ctor.prototype = superCtor.prototype
    ctor.super_ = superCtor
  }
  return ctor
}

function isArray(arr:any):boolean {
  return Array.isArray(arr)
}

// since nodejs modules uses es5 export by default, we should use es5 export here
export {
  inherits,
  isArray
}
