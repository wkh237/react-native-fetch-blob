import RNTest from './react-native-testkit/'
import React from 'react'
import RNFetchBlob from 'react-native-fetch-blob'

import {
  Text,
  View,
  Platform,
  Dimensions,
  Image,
} from 'react-native';

const fs = RNFetchBlob.fs
const { Assert, Comparer, Info, prop } = RNTest
const describe = RNTest.config({
  group : '0.8.0',
  run : true,
  expand : true,
  timeout : 10000,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, FILENAME, DROPBOX_TOKEN, styles } = prop()
const  dirs = RNFetchBlob.fs.dirs

describe('upload BASE64 v.s. Storage', (report, done) => {

  let b64data = null
  let storageFile = dirs.DocumentDir + '/benchmark-1mb'
  let b64res, storageRes
  let iteration = 50

  RNFetchBlob
    .config({ path : storageFile })
    .fetch('get', `${TEST_SERVER_URL}/public/1mb-dummy`)
    .then((res) => res.readFile('base64'))
    .then((data) => {
      b64data = data
      report(
        <Info key="test data should correct">
          <Text>size of b64data = {data.length}</Text>
        </Info>)
      b64Test()
    })

    // base64 upload benchmark
    function b64Test() {
      let p = Promise.resolve()
      let begin = Date.now()
      let count = 0
      for(let i=0; i< iteration; i++) {
        p = p.then(() => {
          if(++count <iteration)
            return RNFetchBlob.fetch('POST', `${TEST_SERVER_URL}/echo`, {}, b64data)
          else {
            b64res = Date.now() - begin
            storageTest()
          }
        })
      }
    }

    // storage upload benchmark
    function storageTest() {
      let p = Promise.resolve()
      let begin = Date.now()
      let count = 0
      for(let i=0; i< iteration; i++) {
        p = p.then(() => {
          if(++count < iteration)
            return RNFetchBlob.fetch('POST', `${TEST_SERVER_URL}/echo`, {}, RNFetchBlob.wrap(storageFile))
          else {
            storageRes = Date.now() - begin
            summary()
          }
        })
      }
    }

    function summary() {
      report(
        <Info key="BASE64">
          <Text>{`BASE64 ${b64res/iteration} ms/req`}</Text>
        </Info>,
        <Info key="Storage">
          <Text>{`Storage ${storageRes/iteration} ms/req`}</Text>
        </Info>)
      done()
    }

})
