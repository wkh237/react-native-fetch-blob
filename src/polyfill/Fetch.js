import RNFetchBlob from '../index.js'
import Log from '../utils/log.js'
import fs from '../fs'
import unicode from '../utils/unicode'

const log = new Log('FetchPolyfill')

log.level(3)


export default class Fetch {

  provider:RNFetchBlobFetch;

  constructor(config:RNFetchBlobConfig) {
    this.provider = new RNFetchBlobFetch(config)
  }

}

class RNFetchBlobFetch {

  constructor(config:RNFetchBlobConfig) {
    this._fetch = (url, options) => {
      let bodyUsed = false
      options.headers = options.headers || {}
      options['Content-Type'] = options.headers['Content-Type'] || options.headers['content-type']
      options['content-type'] = options.headers['Content-Type'] || options.headers['content-type']
      return RNFetchBlob.config(config)
        .fetch(options.method, url, options.headers, options.body)
        .then((resp) => {
          let info = resp.info()
          return Promise.resolve({
            headers : info.headers,
            ok : info.status >= 200 && info.status <= 299,
            status : info.status,
            type : 'basic',
            bodyUsed,
            arrayBuffer : () => {
              log.verbose('to arrayBuffer', info)

            },
            text : () => {
              log.verbose('to text', resp, info)
              switch (info.rnfbEncode) {
                case 'base64':
                  let result = unicode(resp.text())
                  return Promise.resolve(result)
                  break
                case 'path':
                  return resp.readFile('utf8').then((data) => {
                    data = unicode(data)
                    return Promise.resolve(data)
                  })
                  break
                case '':
                default:
                  return Promise.resolve(resp.data)
                  break
              }
            },
            json : () => {
              log.verbose('to json', resp, info)
              switch (info.rnfbEncode) {
                case 'base64':
                  return Promise.resolve(resp.json())
                case 'path':
                  return resp.readFile('utf8').then((data) => {
                    return Promise.resolve(JSON.parse(data))
                  })
                case '':
                default:
                  return Promise.resolve(JSON.parse(resp.data))
              }
            },
            formData : () => {
              log.verbose('to formData', resp, info)

            }
          })
        })
    }
  }

  get fetch() {
    return this._fetch
  }

}
