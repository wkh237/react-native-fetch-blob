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
// window.fetch = new RNFetchBlob.polyfill.Fetch({
//   auto : true,
//   binaryContentTypes : ['image/', 'video/', 'audio/']
// }).build()

const fs = RNFetchBlob.fs
const { Assert, Comparer, Info, prop } = RNTest
const describe = RNTest.config({
  group : '0.9.4',
  run : true,
  expand : true,
  timeout : 20000,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, FILENAME, DROPBOX_TOKEN, styles } = prop()
const dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')

describe('issue #105', (report, done) => {
  let tmp = null
  RNFetchBlob
    .config({ fileCache : true })
    .fetch('GET', `${TEST_SERVER_URL}/public/github.png`)
    .then((res) => {
      tmp = res.path()
      return RNFetchBlob.fetch('POST', `${TEST_SERVER_URL}/upload-form`, {
        'Content-Type' : 'multipart/form-data'
      }, [
        { name : 'data', data : 'issue#105 test' },
        { name : 'file', filename : 'github.png', data : RNFetchBlob.wrap(tmp) }
      ])
    })
    .then((res) => {
      done()
    })
})

describe('issue #106', (report, done) => {

  fetch('https://rnfb-test-app.firebaseapp.com/6m-json.json')
    .then((res) => {
      console.log('##',res)
      console.log('## converted')
      return res.json()
    })
    .then((data) => {
      console.log(data)
      done()
    })

})
