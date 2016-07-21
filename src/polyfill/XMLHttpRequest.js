// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.

import RNFetchBlob from '../index.js'
import XMLHttpRequestEventTarget from './XMLHttpRequestEventTarget.js'
import Log from '../utils/log.js'
import Blob from './Blob.js'

const log = new Log('XMLHttpRequest')

log.level(3)

const UNSENT = 0
const OPENED = 1
const HEADERS_RECEIVED = 2
const LOADING = 3
const DONE = 4

export default class XMLHttpRequest extends XMLHttpRequestEventTarget{

  _onreadystatechange : () => void;

  _readyState : number = UNSENT;
  _response : any = '';
  _responseText : any = '';
  _responseHeaders : any = '';
  _responseType : '' | 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' = '';
  // TODO : not suppoted for now
  _responseURL : null = '';
  _responseXML : null = '';
  _status : number;
  _statusText : string;
  _timeout : number = 0;
  _upload : XMLHttpRequestEventTarget;

  // RNFetchBlob compatible data structure
  _config : RNFetchBlobConfig;
  _url : any;
  _method : string;
  _headers: any;
  _body: any;

  // RNFetchBlob promise object, which has `progress`, `uploadProgress`, and
  // `cancel` methods.
  _task: any;

  static get UNSENT() {
    return UNSENT
  }

  static get OPENED() {
    return OPENED
  }

  static get HEADERS_RECEIVED() {
    return HEADERS_RECEIVED
  }

  static get LOADING() {
    return LOADING
  }

  static get DONE() {
    return DONE
  }

  constructor(...args) {
    super()
    log.verbose('XMLHttpRequest constructor called', args)
    this._config = {}
    this._args = {}
    this._headers = {}
  }

  // XMLHttpRequest.open, always async, user and password not supported.
  open(method:string, url:string, async:true, user:any, password:any) {
    log.verbose('XMLHttpRequest open ', method, url, async, user, password)
    this._method = method
    this._url = url
    this.readyState = XMLHttpRequest.OPENED
  }

  /**
   * Invoke this function to send HTTP request, and set body.
   * @param  {any} body Body in RNfetchblob flavor
   */
  send(body) {
    log.verbose('XMLHttpRequest send ', body)
    let {_method, _url, _headers } = this
    log.verbose('sending request with args', _method, _url, _headers, body)

    this._upload = new XMLHttpRequestEventTarget()
    log.verbose(typeof body, body instanceof FormData)

    if(body instanceof Blob) {
      body = RNFetchBlob.wrap(body.getRNFetchBlobRef())
    }

    this.dispatchEvent('loadstart')
    if(this.onloadstart)
      this.onloadstart()

    this._task = RNFetchBlob.fetch(_method, _url, _headers, body)
    this._task
        .stateChange(this._headerReceived.bind(this))
        .uploadProgress(this._progressEvent.bind(this))
        .progress(this._progressEvent.bind(this))
        .catch(this._onError.bind(this))
        .then(this._onDone.bind(this))
  }

  overrideMimeType(mime:string) {
    log.verbose('XMLHttpRequest overrideMimeType', mime)
    this._headers['content-type'] = mime
  }

  setRequestHeader(name, value) {
    log.verbose('XMLHttpRequest set header', name, value)
    this._headers[name] = value
  }

  abort() {
    log.verbose('XMLHttpRequest abort ')
    if(!this._task)
      return
    this._task.cancel((err) => {
      let e = {
        timeStamp : Date.now(),
      }
      if(this.onabort)
        this.onabort()
      if(err) {
        e.detail = err
        e.type = 'error'
        this.dispatchEvent('error', e)
      }
      else {
        e.type = 'abort'
        this.dispatchEvent('abort', e)
      }
    })
  }

  getResponseHeader(field:string):string | null {
    log.verbose('XMLHttpRequest get header', field)
    if(!this.responseHeaders)
      return null
    return this.responseHeaders[field] || null

  }

  getAllResponseHeaders():string | null {
    log.verbose('XMLHttpRequest get all headers')
    if(!this.responseHeaders)
      return null
    let result = ''
    let respHeaders = this.responseHeaders
    for(let i in respHeaders) {
      result += `${i}:${respHeaders[i]}\r\n`
    }
    return result
  }

  _headerReceived(e) {
    log.verbose('header received ', e)
    this.responseURL = this._url
    if(e.state === "2") {
      this.readyState = XMLHttpRequest.HEADERS_RECEIVED
      this.responseHeaders = e.headers
      this._responseText = e.status
      this._responseType = e.respType || ''
      this.status = Math.floor(e.status)
    }
  }

  _progressEvent(send:number, total:number) {
    log.verbose(this.readyState)
    if(this.readyState === XMLHttpRequest.HEADERS_RECEIVED)
      this.readyState = XMLHttpRequest.LOADING
    let lengthComputable = false
    let e = { lengthComputable }
    if(total && total >= 0)
        e.lengthComputable = true
    else {
      Object.assign(e, { loaded : send, total })
    }

    if(this.onprogress)
      this.onprogress(e)
    this.dispatchEvent('progress', e)
  }

  _onError(err) {
    log.verbose('XMLHttpRequest error', err)
    this.statusText = err
    this.status = String(err).match(/\d+/)
    this.status = this.status ? Math.floor(this.status) : 404
    this.readyState = XMLHttpRequest.DONE
    if(String(err).match('timeout') !== null) {
      this.dispatchEvent('timeout')
      if(this.ontimeout)
        this.ontimeout()
    }
    else if(this.onerror) {
      this.dispatchEvent('error')
      this.onerror({
        type : 'error',
        detail : err
      })
    }
  }

  _onDone(resp) {
    log.verbose('XMLHttpRequest done', this)
    this.statusText = '200 OK'
    this._status = 200
    switch(resp.type) {
      case 'base64' :
        if(this.responseType === 'json') {
            this._responseText = resp.text()
            this._response = resp.json()
        }
        else {
          this._responseType = resp.text()
          this._response = this.responseText
        }
      break;
      case 'path' :
        this.responseType = 'blob'
        this.response = resp.blob()
      break;
    }
    this.dispatchEvent('loadend')
    if(this.onloadend)
      this.onloadend()
    this.dispatchEvent('load')
    if(this._onload)
      this._onload()
    this.readyState = XMLHttpRequest.DONE
  }

  set onreadystatechange(fn:() => void) {
    log.verbose('XMLHttpRequest set onreadystatechange', fn.toString())
    this._onreadystatechange = fn
  }

  set readyState(val:number) {

    log.verbose('XMLHttpRequest ready state changed to ', val)
    this._readyState = val
    if(this._onreadystatechange) {
      log.verbose('trigger onreadystatechange event', this._readyState)
      log.verbose(this._onreadystatechange)
      this.dispatchEvent('readystatechange', )
      if(this._onreadystatechange)
        this._onreadystatechange()
    }
  }

  get readyState() {
    log.verbose('get readyState', this._readyState)
    return this._readyState
  }

  get status() {
    log.verbose('get status', this._status)
    return this._status
  }

  set statusText(val) {
    this._statusText = val
  }

  get statusText() {
    log.verbose('get statusText', this._statusText)
    return this._statusText
  }

  set response(val) {
    log.verbose('set response', val)
    this._response = val
  }

  get response() {
    log.verbose('get response', this._response)
    return this._response
  }

  get responseText() {
    log.verbose('get responseText', this._responseText)
    return this._responseText
  }

  get responseURL() {
    log.verbose('get responseURL', this._responseURL)
    return this._responseURL
  }

  get responseHeaders() {
    log.verbose('get responseHeaders', this._responseHeaders)
    return this._responseHeaders
  }

  set timeout(val) {
    log.verbose('set timeout', this._timeout)
    this._timeout = val
  }

  get timeout() {
    log.verbose('get timeout', this._timeout)
    return this._timeout
  }

  get upload() {
    log.verbose('get upload', this._upload)
    return this._upload
  }

  get responseType() {
    log.verbose('get response type', this._responseType)
    return this._responseType
  }

}
