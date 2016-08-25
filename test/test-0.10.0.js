import RNTest from './react-native-testkit/'
import React from 'react'
import RNFetchBlob from 'react-native-fetch-blob'
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Linking,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
const JSONStream = RNFetchBlob.JSONStream
const fs = RNFetchBlob.fs
const { Assert, Comparer, Info, prop } = RNTest
const describe = RNTest.config({
  group : '0.10.0',
  run : true,
  expand : true,
  timeout : 20000,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, FILENAME, DROPBOX_TOKEN, styles } = prop()
const dirs = RNFetchBlob.fs.dirs
let prefix = ((Platform.OS === 'android') ? 'file://' : '')
let begin = Date.now()

describe('json stream via HTTP', (report, done) => {

  let count = 0
  JSONStream(`${TEST_SERVER_URL}/public/json-dummy.json`).node('name', (name) => {
    count++
    if(Date.now() - begin < 100)
    return
    begin = Date.now()
    report(<Info key="report" uid="100">
      <Text>{count} records</Text>
    </Info>)
    done()
  })

})

describe('json stream via fs', (report, done) => {

  let fetch2 = new RNFetchBlob.polyfill.Fetch({
    auto : true
  })
  let res = null
  let count = 0

  RNFetchBlob.config({
    fileCache : true
  })
  .fetch('GET',`${TEST_SERVER_URL}/public/json-dummy.json`)
  .then((resp) => {
    res = resp
    JSONStream({
      url : RNFetchBlob.wrap(res.path()),
      headers : { bufferSize : 10240 }
    }).node('name', (name) => {
      count++
      if(Date.now() - begin < 100)
      return
      begin = Date.now()
      report(<Info key="report" uid="100">
        <Text>{count} records</Text>
      </Info>)
      done()
    })
  })

})
