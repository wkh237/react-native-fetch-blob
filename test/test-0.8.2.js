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
  group : '0.8.2',
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
    console.log(data)
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

RNTest.config({
  group : '0.8.2',
  run : true,
  expand : true,
  timeout : 24000
})('request should not retry after timed out', (report, done) => {

  let count = 0
  RNFetchBlob
    // .config({timeout : 2000})
    .fetch('GET', `${TEST_SERVER_URL}/timeout408`)
    .then((res) => {
      report(<Assert key="request should not success" expect={true} actual={false}/>)
    })
    .catch(() => {
      count ++
    })
  setTimeout(() => {
    report(<Assert key="request does not retry" expect={1} actual={count}/>)
    done()
  }, 12000)
})
