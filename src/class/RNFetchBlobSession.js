// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.

import {
 NativeModules,
 DeviceEventEmitter,
 NativeAppEventEmitter,
} from 'react-native'

const RNFetchBlob = NativeModules.RNFetchBlob
const emitter = DeviceEventEmitter

let sessions = {}

export default class RNFetchBlobSession {

  add : (path:string) => RNFetchBlobSession;
  remove : (path:string) => RNFetchBlobSession;
  dispose : () => Promise;
  list : () => Array<string>;
  name : string;

  static getSession(name:string):any {
    return sessions[name]
  }

  static setSession(name:string, val:any) {
    sessions[name] = val
  }

  static removeSession(name:string) {
    delete sessions[name]
  }

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
