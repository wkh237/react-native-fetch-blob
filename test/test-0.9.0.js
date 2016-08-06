import RNTest from './react-native-testkit/'
import React from 'react'
import RNFetchBlob from 'react-native-fetch-blob'

import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  Dimensions,
  Image,
} from 'react-native';

window.XMLHttpRequest = RNFetchBlob.polyfill.XMLHttpRequest
window.Blob = RNFetchBlob.polyfill.Blob
window.fetch = new RNFetchBlob.polyfill.Fetch({
  auto : true,
  binaryContentTypes : ['image/', 'video/', 'audio/']
}).build()

const fs = RNFetchBlob.fs
const { Assert, Comparer, Info, prop } = RNTest
const describe = RNTest.config({
  group : '0.9.0',
  run : true,
  expand : true,
  timeout : 20000,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, FILENAME, DROPBOX_TOKEN, styles } = prop()
const dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')

describe('#73 unicode response BASE64 content test', (report, done) => {

  fetch(`${TEST_SERVER_URL}/unicode`, {
    method : 'GET'
  })
  .then((res) => {
    return res.json()
  })
  .then((data) => {
    report(<Assert key="data should correct" expect={'你好!'} actual={data.data}/>)
    done()
  })
})

describe('#73 unicode response content test', (report, done) => {
  let expect = '中文!檔案\\u00測試 ABCDE 測試'
  RNFetchBlob.config({ fileCache : true })
    .fetch('GET', `${TEST_SERVER_URL}/public/utf8-dummy`, {
      method : 'GET'
    })
    .then((res) => res.readFile('utf8'))
    .then((data) => {
      report(
        <Assert key="data should correct"
          expect={expect}
          actual={data}/>)
      done()
    })
})

describe = RNTest.config({
  group : '0.9.0',
  run : true,
  expand : true,
  timeout : 24000
})

describe('request should not retry after timed out', (report, done) => {

  let count = 0
  let task = RNFetchBlob
    .fetch('GET', `${TEST_SERVER_URL}/timeout408/${Date.now()}`)
  task.then((res) => {
    report(<Assert key="request should not success" expect={true} actual={false}/>)
  })
  .catch(() => {
    task.cancel()
    count ++
  })
  setTimeout(() => {
    report(<Assert key="request does not retry" expect={1} actual={count}/>)
    done()
  }, 12000)
})

describe = RNTest.config({
  group : '0.9.0',
  run : true,
  expand : true,
  timeout : 65000
})

describe('long live download or upload task won\'t timeout', (report, done) => {

  RNFetchBlob.config({timeout : 0})
  .fetch('GET', `${TEST_SERVER_URL}/long/`)
  .then((res) => {
    report(
      <Assert key="download not terminated" expect={true} actual={true}/>,
      <Info key={res.text()}/>)
    done()
  })

})
