// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.
// @flow
import Log from '../utils/log'
const parse = require('path-parse')
const log = new Log('node-path')
log.level(3)
log.info('polyfill loaded')

const sep = '/'

function basename(str:string):string {
  log.verbose('basename', str)
  return parse(str).base
}

function dirname(str:string):string {
  log.verbose('dirname', str)
  return parse(str).dir
}

function extname(str:string):string {
  log.verbose('extname', str)
  return parse(str).ext
}

function format(args:any):string {
  log.verbose('format', args)
  // TODO :
}

function isAbsolute(str:string):boolean {
  log.verbose('isAbsolute', str)
  // TODO :
  return true
}

function join(arr:Array):string {
  log.verbose('join', arr)
  // TODO : error handling and type checking
  return arr.join('')
}

function normalize(str:string):string {
  log.verbose('normalize', str)
  // TODO
  return str
}

// since nodejs modules uses es5 export by default, we should use es5 export here
export {
  extname,
  dirname,
  basename,
  // TODOs
  normalize,
}
