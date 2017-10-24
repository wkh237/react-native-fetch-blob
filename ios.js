// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.

import {
  NativeModules,
  DeviceEventEmitter,
  Platform,
  NativeAppEventEmitter
} from 'react-native'

const RNFetchBlob: RNFetchBlobNative = NativeModules.RNFetchBlob

/**
 * Open a file using UIDocumentInteractionController
 * @param  {string]} path Path of the file to be open.
 * @param  {string} scheme URI scheme that needs to support, optional
 * @return {Promise}
 */
function previewDocument(path: string, scheme: string) {
  if (Platform.OS === 'ios') {
    return RNFetchBlob.previewDocument('file://' + path, scheme)
  } else {
    return Promise.reject('RNFetchBlob.openDocument only supports IOS.')
  }
}

/**
 * Preview a file using UIDocumentInteractionController
 * @param  {string]} path Path of the file to be open.
 * @param  {string} scheme URI scheme that needs to support, optional
 * @param  {string} name The name of the target file, optional
 * @return {Promise}
 */
function openDocument(path: string, scheme: string, name: string) {
  if (Platform.OS === 'ios') {
    return RNFetchBlob.openDocument('file://' + path, scheme, name)
  }
}

/**
 * Preview a file using UIDocumentInteractionController
 * @param  {string} path Path of the file to be open.
 * @param  {string} scheme URI scheme that needs to support, optional
 * @param  {string} fontFamily The name of the font family
 * @param  {string} hexString The color in hex format
 * @param  {number} fontSize Size of the font
 * @param  {string} barTintColor The color of the navigation bar in hex format
 * @return {Promise}
 */
function openDocumentWithFont(
  path: string,
  fontFamily: string,
  fontSize: number,
  hexString: string,
  barTintColor: string,
  scheme: string
) {
  if (Platform.OS === 'ios') {
    return RNFetchBlob.openDocument(
      'file://' + path,
      fontFamily,
      fontSize,
      hexString,
      barTintColor,
      scheme
    )
  }
}

/**
 * Set excludeFromBackupKey to a URL to prevent the resource to be backuped to
 * iCloud.
 * @param  {string} url URL of the resource, only file URL is supported
 * @return {Promise}
 */
function excludeFromBackupKey(url: string) {
  return RNFetchBlob.excludeFromBackupKey('file://' + path)
}

export default {
  openDocument,
  previewDocument,
  excludeFromBackupKey
}
