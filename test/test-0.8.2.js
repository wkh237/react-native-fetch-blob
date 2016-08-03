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
window.Blob = Blob
window.fetch = new RNFetchBlob.polyfill.Fetch({
  auto : true,
  binaryContentTypes : ['image/', 'video/', 'audio/']
}).provider.fetch

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

describe('unicode file access', (report, done) => {
  let path = dirs.DocumentDir + '/chinese.tmp'
  fs.writeFile(path, '你好!', 'utf8')
    .then(() => fs.readFile(path, 'utf8'))
    .then((data) => {
      console.log(data)
      done()
    })
})

describe('whatwg-fetch - GET should work correctly', (report, done) => {
  console.log(fetch)
  fetch(`${TEST_SERVER_URL}/unicode`, {
    method : 'GET'
  })
  .then((res) => {
    console.log('fetch resp',res)
    return res.text()
  })
  .then((blob) => {
    console.log(blob)
    done()
  })
})
