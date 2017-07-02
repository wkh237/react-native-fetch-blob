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

export default class RNFetchBlobFile {

  id: number;
  mode: 'rw' | 'r' | 'w';

  constuctor(id:number, mode: 'rw' | 'r' | 'w') {
    this.id = id
    this.mode = mode
  }

  create(uri:string, mode: 'rw' | 'r' | 'w'):Promise<RNFetchBlobFile> {
    switch(mode) {
      case 'r':
        mode = 1
        break
      case 'w':
        mode = 2
        break
      case 'rw':
        mode = 3
        break
    }
    return RNFetchBlob.openFileHandle(uri, mode).then((handle) => {
      return Promise.resolve(new RNFetchBlobFileHandle(handle, mode))
    })
  }

  write(encoding:string, data:string, offset:number) {
    return RNFetchBlob.writeToHandle(this.id, encode, data, offset)
  }

  read(encoding:string, offset:number, length:number) {
    return RNFetchBlob.readFromHandle(this.id, encoding, offset, length)
  }

  close() {
    return RNFetchBlob.closeHandle(this.id)
  }

}
