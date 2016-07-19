// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.

import RNFetchBlob from '../index.js'
import EventTarget from './EventTarget.js'

export default class XMLHttpRequest extends EventTarget{

  onreadystatechange : () => void;
  onabort : () => void;
  onerror : () => void;
  onload : () => void;
  onloadstart : () => void;
  onprogress : () => void;
  ontimeout : () => void;
  onloadend : () => void;

  readyState : number;
  response : any;
  responseText : any;
  responseHeaders : any;
  responseType : '' | 'arraybuffer' | 'blob' | 'document' | 'json' | 'text';
  // TODO : not suppoted for now
  responseURL : null;
  responseXML : null;
  status : number;
  statusText : string;
  timeout : number;

  // RNFetchBlob compatible data structure
  _config : RNFetchBlobConfig;
  _url : any;
  _method : string;
  _headers: any;
  _body: any;

  // RNFetchBlob promise object, which has `progress`, `uploadProgress`, and
  // `cancel` methods.
  _task: any;

  constructor(...args) {
    super()
    console.log('XMLHttpRequest constructor called', args)
    this._config = {}
    this._args = {}
    this._headers = {}
    this.readyState = 0
    this.response = null
    this.responseText = null
    this.responseHeaders = null
  }

  // XMLHttpRequest.open, always async, user and password not supported.
  open(method:string, url:string, async:true, user:any, password:any) {
    console.log('XMLHttpRequest open called', method, url, async, user, password)
    this._method = method
    this._url = url
    this.readyState = 1
    if(this.onload)
      this.onload()
    if(this.onloadstart)
      this.onloadstart()
    this._invokeOnStateChange()
  }

  addEventListener(event, listener) {
    console.log('XMLHttpRequest add listener', event, listener.toString())
    this.addEventListener(event, listener)
  }

  /**
   * Invoke this function to send HTTP request, and set body.
   * @param  {any} body Body in RNfetchblob flavor
   */
  send(body) {
    console.log('XMLHttpRequest send called', body)
    let {_method, _url, _headers } = this
    console.log('sending request with args', _method, _url, _headers, body)

    this._task = RNFetchBlob.fetch(_method, _url, _headers, body)
    this._task
        .stateChange((e) => {
          console.log('state change')
          if(e.state === "2") {
            this.readyState = 2
            this.responseHeaders = e.headers
          }
          this._invokeOnStateChange()
        })
        .uploadProgress(this._progressEvent)
        .onProgress(this._progressEvent)
        .then(this._onDone)
        .catch(this._onError)
  }

  overrideMimeType(mime:string) {
    this.headers['content-type'] = mime
  }

  setRequestHeader(name, value) {
    console.log('XMLHttpRequest set header', name, value)
    this._headers[name] = value
  }

  abort() {
    console.log('XMLHttpRequest abort called', this._task)
    if(!this._task)
      return
    this._task.cancel((err) => {
      let e = {
        timeStamp : Date.now(),
      }
      if(this.onabort)
        this.onabort()
      if(!err) {
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

    if(!this.responseHeaders)
      return null
    return this.responseHeaders[field] || null

  }

  getAllResponseHeaders():string | null {

    if(!this.responseHeaders)
      return null
    let result = ''
    let respHeaders = this.responseHeaders
    for(let i in respHeaders) {
      result += `${i}:${respHeaders[i]}\r\n`
    }
    return result
  }

  _progressEvent(send:number, total:number) {
    let lengthComputable = false
    if(total && total >= 0)
        lengthComputable = true
    else {
      this.dispatchEvent('progress',
        { loaded : send, total, lengthComputable })
    }

    if(this.onprogress)
      this.onprogress({loaded : send, total, lengthComputable})
  }

  _onError(err) {
    console.log('XMLHttpRequest error', err)
    this.statusText = err
    this.status = String(err).match(/\d+/)
    this.status = this.status ? Math.floor(this.status) : 404
    this.readyState = 4
    if(String(err).match('timeout') !== null) {
      if(this.ontimeout)
        this.ontimeout()
    }
    else if(this.onerror) {
      this.onerror({
        type : 'error',
        detail : err
      })
    }
    this._invokeOnStateChange()
  }

  _onDone(resp) {
    console.log('XMLHttpRequest done', resp.text())
    this.statusText = '200 OK'
    this.status = 200
    switch(resp.type) {
      case 'base64' :
      this.responseType = 'text'
      this.responseText = resp.text()
      this.response = this.responseText
      break;
      case 'path' :
      this.responseType = 'blob'
      this.response = resp.blob()
      break;
    }
    this.readyState = 4
    this._invokeOnStateChange()
  }

  _invokeOnStateChange() {
    if(this.onreadystatechange)
      this.onreadystatechange()
  }

}
