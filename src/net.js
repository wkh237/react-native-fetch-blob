// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.

import {
  NativeModules,
  DeviceEventEmitter,
  Platform,
  NativeAppEventEmitter,
} from 'react-native'

const RNFetchBlob = NativeModules.RNFetchBlob

/**
 * Get cookie according to the given url.
 * @param  {string} domain Domain of the cookies to be removed, remove all
 * @return {Promise<Array<String>>}     Cookies of a specific domain.
 */
function getCookies(domain:string):Promise<Array<String>> {
  return RNFetchBlob.getCookies(domain || '')
}

/**
 * Remove cookies for a specific domain
 * @param  {?string} domain Domain of the cookies to be removed, remove all
 * cookies when this is null.
 * @return {Promise<null>}
 */
function removeCookies(domain:?string):Promise<null> {
  return RNFetchBlob.removeCookies(domain || '')
}

export default {
  getCookies,
  removeCookies
}
