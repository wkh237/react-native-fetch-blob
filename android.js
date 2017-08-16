// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.

import {
  NativeModules,
  DeviceEventEmitter,
  Platform,
  NativeAppEventEmitter,
} from 'react-native'

const RNFetchBlob:RNFetchBlobNative = NativeModules.RNFetchBlob

/**
 * Send an intent to open the file.
 * @param  {string} path Path of the file to be open.
 * @param  {string} mime MIME type string
 * @return {Promise}
 */
function actionViewIntent(path:string, mime:string = 'text/plain') {
  if(Platform.OS === 'android')
    return RNFetchBlob.actionViewIntent(path, mime)
  else
    return Promise.reject('RNFetchBlob.android.actionViewIntent only supports Android.')
}

function getContentIntent(mime:string) {
  if(Platform.OS === 'android')
    return RNFetchBlob.getContentIntent(mime)
  else
    return Promise.reject('RNFetchBlob.android.getContentIntent only supports Android.')
}

function addCompleteDownload(config) {
  if(Platform.OS === 'android')
    return RNFetchBlob.addCompleteDownload(config)
  else
    return Promise.reject('RNFetchBlob.android.addCompleteDownload only supports Android.')
}


export default {
  actionViewIntent,
  getContentIntent,
  addCompleteDownload
}
