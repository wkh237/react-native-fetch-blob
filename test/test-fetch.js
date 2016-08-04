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

window.Blob = RNFetchBlob.polyfill.Blob
window.fetch = new RNFetchBlob.polyfill.Fetch({
  auto : true,
  binaryContentTypes : ['image/', 'video/', 'audio/']
}).build()

const fs = RNFetchBlob.fs
const { Assert, Comparer, Info, prop } = RNTest
const describe = RNTest.config({
  group : 'Fetch polyfill',
  run : true,
  expand : true,
  timeout : 10000,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, FILENAME, DROPBOX_TOKEN, styles } = prop()
const dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')

describe('GET request test : text -> any', (report, done) => {

  function get(fn1, fn2) {
    return fetch(`${TEST_SERVER_URL}/unicode`, { method : 'GET'})
    .then((res) => fn1(res))
    .then((data) => fn2(data))
  }
  let promises =
  [
    get((res) => res.json(), (json) => {
      report(<Assert key="json data correct" expect={'你好!'} actual={json.data}/>)
    }),
    get((res) => res.text(), (text) => {
      report(<Assert key="text data correct" expect={'你好!'} actual={JSON.parse(text).data}/>)
    }),
    get((res) => res.blob(), (blob) => {
      let path = blob.getRNFetchBlobRef()
      return fs.readFile(path, 'utf8').then((text) => {
        console.log(text)
        report(<Assert key="blob data correct" expect={'你好!'} actual={JSON.parse(text).data}/>)
      })
    }),
    // get((res) => res.arrayBuffer(), (text) => {
    //   report(<Assert key="text data correct" expect={'你好!'} actual={JSON.parse(text).data}/>)
    // })
  ]

  Promise.all(promises).then(() => {
    done()
  })

})

describe('GET request which has json response', (report, done) => {

})

describe('GET request which has blob response', (report, done) => {

})
