import RNTest from './react-native-testkit/'
import React from 'react'
import RNFetchBlob from 'react-native-fetch-blob'
import Timer from 'react-timer-mixin'

import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  CameraRoll,
  Platform,
  Dimensions,
  Image,
} from 'react-native';

const fs = RNFetchBlob.fs
const Blob = RNFetchBlob.polyfill.Blob

window.XMLHttpRequest = RNFetchBlob.polyfill.XMLHttpRequest
window.Blob = Blob
window.ProgressEvent = RNFetchBlob.polyfill.ProgressEvent

const { Assert, Comparer, Info, prop } = RNTest
const describe = RNTest.config({
  group : 'XMLHttpRequest',
  run : true,
  expand : false,
  timeout : 20000,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, DROPBOX_TOKEN, styles } = prop()
const  dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')
let file = RNTest.prop('image')

/**
 * Test cases are based on W3C github repository.
 * {@link https://github.com/w3c/web-platform-tests/blob/master/XMLHttpRequest/}
 */

describe('unsent state test', (report, done) => {

  let xhr = new XMLHttpRequest()

  try {
    xhr.setRequestHeader('x-test', 'test')
  } catch(err) {
    report(
      <Assert key="should throw InvalidState if setRequestHeader()"
        actual={/invalidstate/i.test(err)}
        expect={true}
      />)
  }

  try {
    let xhr = new XMLHttpRequest()
    xhr.send(null)
  } catch(err) {
    report(
      <Assert key="should throw InvalidState if send()"
        actual={/invalidstate/i.test(err)}
        expect={true}
      />)
  }
  try {
    report(
      <Assert key="status is 0"
        expect={0}
        actual={xhr.status} />,
      <Assert key="statusText is empty"
        expect={''}
        actual={xhr.statusText} />,
      <Assert key="responseHeaders is empty"
        expect={''}
        actual={xhr.getAllResponseHeaders()} />,
      <Assert key="response header should not be set"
        expect={null}
        actual={xhr.getResponseHeader('x-test')} />,
      <Assert key="readyState should correct"
        expect={XMLHttpRequest.UNSENT}
        actual={xhr.readyState} />
    )
    done()
  } catch(err) {
    console.log(err.stack)
  }
})

describe('HTTP error should not throw error event', (report, done) => {

  onError('GET', 200)
  onError('GET', 400)
  onError('GET', 401)
  onError('GET', 404)
  onError('GET', 410)
  onError('GET', 500)
  onError('GET', 699)

  onError('HEAD', 200)
  onError('HEAD', 404)
  onError('HEAD', 500)
  onError('HEAD', 699)

  onError('POST', 200)
  onError('POST', 404)
  onError('POST', 500)
  onError('POST', 699)

  onError('PUT', 200)
  onError('PUT', 404)
  onError('PUT', 500)
  onError('PUT', 699)

  done()

  let count = 0
  function onError(method, code) {
    let xhr = new XMLHttpRequest()
    xhr.open(method, `${TEST_SERVER_URL}/xhr-code/${code}`)
    xhr.onreadystatechange = function() {
      count++
      if(this.readyState == XMLHttpRequest.DONE) {
        report(
          <Assert
            key={`#${count} response data of ${method} ${code} should be empty`}
            expect=""
            actual={xhr.response}/>,
          <Assert
            key={`#${count} status of ${method} ${code} should be ${code}`}
            expect={code}
            actual={xhr.status}/>
        )
      }
    }
    xhr.onerror = function() {
      report(
        <Assert
          key={`HTTP error ${code} should not throw error event`}
          expect={false}
          actual={true}/>)
    }
    xhr.send()
  }

})

describe('request headers records should be cleared by open()', (report, done) => {
  let xhr = new XMLHttpRequest()
  xhr.open('GET', `${TEST_SERVER_URL}/xhr-header`)
  xhr.setRequestHeader('value', '100')
  xhr.setRequestHeader('cache-control', 'no-store')
  xhr.open('GET', `${TEST_SERVER_URL}/xhr-header`)
  xhr.setRequestHeader('value', '200')
  xhr.send()
  xhr.onreadystatechange = function() {
    if(this.readyState == 4) {
      report(<Assert key="headers should be cleared by open()"
        expect={"200"}
        actual={JSON.parse(this.response).value}/>)
      done()
    }
  }
})

/**
 *  {@link https://github.com/w3c/web-platform-tests/blob/master/XMLHttpRequest/setrequestheader-bogus-name.htm}
 */
describe('invalid characters should not exists in header field', (report, done) => {
  function try_name(name) {
    try {
      let client = new XMLHttpRequest()
      client.open("GET", `${TEST_SERVER_URL}/public/github.png`)
      client.setRequestHeader(name, '123')
    } catch(err) {
      report(
        <Assert key={`invalid header type ${name} should throw SyntaxError`}
          actual={/syntaxerror/i.test(err)}
          expect={true}
        />)
    }
  }
  function try_byte_string(name) {
    try {
      let client = new XMLHttpRequest()
      client.open("GET", `${TEST_SERVER_URL}/public/github.png`)
      client.setRequestHeader(name, '123')
    } catch(err) {
      report(
        <Assert key={`invalid header field ${name} type should throw TypeError`}
          actual={/typeerror/i.test(err)}
          expect={true}
        />)
    }
  }
  var invalid_headers = ["(", ")", "<", ">", "@", ",", ";", ":", "\\",
                         "\"", "/", "[", "]", "?", "=", "{", "}", " ",
                         "\u007f", "", "t\rt", "t\nt", "t: t", "t:t",
                         "t<t", "t t", " tt", ":tt", "\ttt", "\vtt", "t\0t",
                         "t\"t", "t,t", "t;t", "()[]{}", "a?B", "a=B"]
  var invalid_byte_strings = ["ﾃｽﾄ", "X-ﾃｽﾄ"]
  for (var i = 0; i < 32; ++i) {
    invalid_headers.push(String.fromCharCode(i))
  }
  for (var i = 0; i < invalid_headers.length; ++i) {
    try_name(invalid_headers[i])
  }
  for (var i = 0; i < invalid_byte_strings.length; ++i) {
    try_byte_string(invalid_byte_strings[i])
  }
  done()

})

describe('invoke setRequestHeader() before open()', (report, done) => {
  try {
    let xhr = new XMLHttpRequest()
    xhr.setRequestHeader('foo', 'bar')
  } catch(err) {
    report(
      <Info key="error message">
        <Text>{err}</Text>
      </Info>,
      <Assert key="should throw InvalidStateError"
        expect={true}
        actual={/invalidstateerror/i.test(err)}/>)
      done()
  }
})

describe('upload progress event test', (report, done) => {
  let xhr = new XMLHttpRequest()
  let time = Date.now()
  let msg =  `time=${time}`
  xhr.upload.onprogress = function(e) {
    report(
      <Assert key="event object is an instance of ProgressEvent"
        expect={true}
        actual={e instanceof ProgressEvent}/>)
  }
  xhr.onreadystatechange = function() {
    if(this.readyState == XMLHttpRequest.DONE) {
      report(
        <Assert key="reponse should correct"
          expect={time}
          actual={Math.floor(JSON.parse(xhr.response).time)}/>,
        <Assert key="responseType should correct"
          expect={'json'}
          actual={xhr.responseType}/>)
        done()
    }
  }
  xhr.open('POST', `${TEST_SERVER_URL}/upload`)
  xhr.overrideMimeType('application/x-www-form-urlencoded')
  xhr.send(msg)

})

describe('timeout event catchable', (report, done) => {
  let xhr = new XMLHttpRequest()
  let count = 0
  xhr.timeout = 1
  xhr.ontimeout = function() {
    report(
      <Info key="event should only trigger once" uid="1000">
        <Text>{count}</Text>
      </Info>,
      <Assert key="event catchable"
        expect={true}
        actual={true}/>)
      done()
  }
  xhr.open('GET', `${TEST_SERVER_URL}/timeout/`)
  xhr.send()

})

describe('upload progress event should not be triggered when body is empty', (report, done) => {
  let xhr = new XMLHttpRequest()
  let count = 0
  xhr.upload.onloadstart = function() {
    report(
      <Assert key="loadstart event should not triggered"
        uid="aaa"
        expect={true}
        actual={false}/>)
  }
  xhr.upload.onprogress = function() {
    report(
      <Assert key="progress event should not triggered"
        uid="bbb"
        expect={true}
        actual={false}/>)
  }
  xhr.onreadystatechange = function() {
    if(this.readyState == XMLHttpRequest.DONE) {
      count++
      report(
        <Assert key="Great! upload event not triggered"
          uid="ccc"
          expect={true}
          actual={true}/>,
        <Assert key="This should not triggered multiple times"
          uid="ddd"
          expect={1}
          actual={count}/>)
      done()
    }
  }
  xhr.open('GET', `${TEST_SERVER_URL}/public/github.png`)
  xhr.send()
})
