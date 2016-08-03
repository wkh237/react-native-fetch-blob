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

describe('whatwg-fetch - GET should work correctly', (report, done) => {
  console.log(fetch)
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

RNTest.config({
  group : '0.8.2',
  run : true,
  expand : false,
  timeout : 24000
})('request should not retry after timed out', (report, done) => {

  let count = 0
  RNFetchBlob
    .config({ timeout : 3000 })
    .fetch('GET', `${TEST_SERVER_URL}/timeout`)
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
