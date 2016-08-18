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

const fs = RNFetchBlob.fs
const { Assert, Comparer, Info, prop } = RNTest
const describe = RNTest.config({
  group : '0.5.2',
  run : true,
  expand : false,
})
const { TEST_SERVER_URL, FILENAME, DROPBOX_TOKEN, styles } = prop()

let prefix = ((Platform.OS === 'android') ? 'file://' : '')


describe('GET request with params', (report, done) => {
  let time = Date.now()
  RNFetchBlob.config({ fileCache : true })
    .fetch('GET', encodeURI(`${TEST_SERVER_URL}/params?time=${time}&name=RNFetchBlobParams&lang=中文`))
    .then((resp) => {
      let file = resp.path()
      return RNFetchBlob.fs.readStream(resp.path(), 'utf8')
    })
    .then((stream) => {
      let result = ''
      stream.open()
      stream.onData((chunk) => {
        result += chunk
      })
      stream.onEnd(() => {
        result = JSON.parse(result)
        report(<Assert key="param#1 should correct"
          expect={parseInt(time)}
          actual={parseInt(result.time)}/>,
        <Assert key="param#2 should correct"
          expect={'RNFetchBlobParams'}
          actual={result.name}/>,
        <Assert key="param contains unicode data should correct"
          expect={'中文'}
          actual={result.lang}/>)
          done()
      })
    })
})


describe('POST request with params', (report, done) => {
  let time = Date.now()
  RNFetchBlob.config({ fileCache : true })
    .fetch('POST', encodeURI(`${TEST_SERVER_URL}/params?time=${time}&name=RNFetchBlobParams&lang=中文`),
    {
      'Content-Type' : 'image/png;BASE64'
    }, RNFetchBlob.base64.encode('123'))
    .then((resp) => {
      let file = resp.path()
      return RNFetchBlob.fs.readStream(resp.path(), 'utf8')
    })
    .then((stream) => {
      let result = ''
      stream.open()
      stream.onData((chunk) => {
        result += chunk
      })
      stream.onEnd(() => {
        console.log(result)
        result = JSON.parse(result)
        report(<Assert key="param#1 should correct"
          expect={parseInt(time)}
          actual={parseInt(result.time)}/>,
        <Assert key="param#2 should correct"
          expect={'RNFetchBlobParams'}
          actual={result.name}/>,
        <Assert key="param contains unicode data should correct"
          expect={'中文'}
          actual={result.lang}/>)
          done()
      })
    })
})
