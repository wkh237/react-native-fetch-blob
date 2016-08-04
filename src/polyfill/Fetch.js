import RNFetchBlob from '../index.js'
import Log from '../utils/log.js'
import fs from '../fs'
import unicode from '../utils/unicode'
import Blob from './Blob'

const log = new Log('FetchPolyfill')

log.level(3)

export default class Fetch {

  constructor(config:RNFetchBlobConfig) {
    Object.assign(this, new RNFetchBlobFetchPolyfill(config))
  }

}

class RNFetchBlobFetchPolyfill {

  constructor(config:RNFetchBlobConfig) {
    this.build = () => (url, options = {}) => {
      options.headers = options.headers || {}
      options['Content-Type'] = options.headers['Content-Type'] || options.headers['content-type']
      options['content-type'] = options.headers['Content-Type'] || options.headers['content-type']
      return RNFetchBlob.config(config)
        .fetch(options.method, url, options.headers, options.body)
        .then((resp) => {
          log.verbose('response', resp)
          let info = resp.info()
          return Promise.resolve(new RNFetchBlobFetchRepsonse(resp))
        })
    }
  }

}

class RNFetchBlobFetchRepsonse {

  constructor(resp:FetchBlobResponse) {
    let info = resp.info()
    this.headers = info.headers
    this.ok = info.status >= 200 && info.status <= 299,
    this.status = info.status
    this.type = 'basic'
    this.bodyUsed = false
    this.resp = resp
    this.rnfbRespInfo = info
    this.rnfbResp = resp
  }

  arrayBuffer(){
    log.verbose('to arrayBuffer', this.rnfbRespInfo)
    return readArrayBuffer(this.rnfbResp, this.rnfbRespInfo)
  }

  text() {
    log.verbose('to text', this.rnfbResp, this.rnfbRespInfo)
    return readText(this.rnfbResp, this.rnfbRespInfo)
  }

  json() {
    log.verbose('to json', this.rnfbResp, this.rnfbRespInfo)
    return readJSON(this.rnfbResp, this.rnfbRespInfo)
  }

  formData() {
    log.verbose('to formData', this.rnfbResp, this.rnfbRespInfo)
    return readFormData(this.rnfbResp, this.rnfbRespInfo)
  }

  blob() {
    log.verbose('to blob', this.rnfbResp, this.rnfbRespInfo)
    return readBlob(this.rnfbResp, this.rnfbRespInfo)
  }
}


function readText(resp, info):Promise<string> {
  switch (info.rnfbEncode) {
    case 'base64':
      return Promise.resolve(resp.text())
      break
    case 'path':
      return resp.readFile('utf8').then((data) => {
        data = unicode(data)
        return Promise.resolve(data)
      })
      break
    default:
      return Promise.resolve(resp.text())
      break
  }
}

function readBlob(resp, info):Promise<object> {
  log.verbose('readBlob', resp, info)
  let cType = info.headers['Content-Type']
  switch (info.rnfbEncode) {
    case 'base64':
      return Blob.build(resp.data, { type : `${cType};BASE64` })
    case 'path':
      return Blob.build(RNFetchBlob.wrap(resp.data), { type : `${cType}`})
    default:
      return Blob.build(resp.data, { type : `${cType}`})
  }
}

function readJSON(resp, info):Promise<object> {
  log.verbose('readJSON', resp, info)
  switch (info.rnfbEncode) {
    case 'base64':
      return Promise.resolve(resp.json())
    case 'path':
      return resp.readFile('utf8').then((data) => {
        return Promise.resolve(JSON.parse(data))
      })
    default:
      return Promise.resolve(JSON.parse(resp.data))
  }
}
