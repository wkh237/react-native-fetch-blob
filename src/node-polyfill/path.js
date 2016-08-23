// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.
// @flow
import Log from '../utils/log'
import path from 'path-parse'
const log = new Log('node-path')

log.level(3)
log.info('node-path polyfill loaded')

const sep = '/'

function basename(str:string):string {
  return path.parse(str).base
}

function dirname(str:string):string {
  return path.parse(str).dir
}

function extname(str:string):string {
  return path.parse(str).ext
}

function format(args:any):string {
  // TODO :
}

function isAbsolute(str:string):boolean {
  // TODO :
  return true
}

function join(arr:Array):string {
  // TODO : error handling and type checking
  return arr.join('')
}

function normalize(str:string):string {
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
