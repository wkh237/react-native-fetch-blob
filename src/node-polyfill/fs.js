// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.
// @flow
import Log from '../utils/log'
const log = new Log('node-fs')

log.level(3)
log.info('polyfill loaded')

// since nodejs modules uses es5 export by default, we should use es5 export here
export {

}
