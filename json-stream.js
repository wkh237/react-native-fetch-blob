import Oboe from './lib/oboe-browser.min.js'
import XMLHttpRequest from './polyfill/XMLHttpRequest'
import URIUtil from './utils/uri'


/*
 * Currently JavaScriptCore does not provide a `self` reference
 * to the global object, which is utilized by browser libraries (i.e bluebird)
 * to have a reliably reference to the global object which works in browsers
 * and web-workers alike.
 *
 * SOURCE: https://github.com/johanneslumpe/react-native-browser-polyfill/blob/master/polyfills/globalself.js
 *
 * Fixes an issue raised as part of #212
 * See https://github.com/wkh237/react-native-fetch-blob/issues/212#issuecomment-326189470 (comment and below)
 */
if (typeof global.self === "undefined") global.self = global;


const OboeExtended = (arg: string | Object) => {
  window.location = ''

  if(!window.XMLHttpRequest.isRNFBPolyfill ) {
    window.XMLHttpRequest = XMLHttpRequest
    console.warn(
        'Use JSONStream will automatically replace window.XMLHttpRequest with RNFetchBlob.polyfill.XMLHttpRequest. ' +
        'You are seeing this warning because you did not replace it manually.'
    )
  }

  if(typeof arg === 'string') {
    if(URIUtil.isFileURI(arg)) {
      arg = {
        url : 'JSONStream://' + arg,
        headers : { noCache : true }
      }
    }
    else
      arg = 'JSONStream://' + arg

  }
  else if(typeof arg === 'object') {
    let headers = arg.headers || {}
    if(URIUtil.isFileURI(arg.url)) {
      headers.noCache = true
    }
    arg = Object.assign(arg, {
      url : 'JSONStream://' + arg.url,
      headers
    })
  }
  return Oboe(arg)
}

export default OboeExtended
