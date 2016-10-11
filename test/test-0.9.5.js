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
  TouchableOpacity,
} from 'react-native';

window.XMLHttpRequest = RNFetchBlob.polyfill.XMLHttpRequest
window.Blob = RNFetchBlob.polyfill.Blob

const fs = RNFetchBlob.fs
const { Assert, Comparer, Info, prop } = RNTest
const describe = RNTest.config({
  group : '0.9.5',
  run : true,
  expand : false,
  timeout : 20000,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, FILENAME, DROPBOX_TOKEN, styles } = prop()
const dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')

describe('issue #122 force response data format', (report, done) => {

  RNFetchBlob.fetch('GET', `${TEST_SERVER_URL}/public/json-dummy-1.json`, {
    'RNFB-Response' : 'base64'
  })
  .then((res) => {
    let r = RNFetchBlob.base64.decode(res.data)
    report(
      <Assert key="test data verify" expect="fetchblob-dev" actual={JSON.parse(r).name}/>,
      <Assert key="should successfully decode the data" expect={true} actual={true}/>)
    return RNFetchBlob.fetch('GET', `${TEST_SERVER_URL}/public/json-dummy-1.json`)
  })
  .then((res) => {
    report(
      <Assert key="response should in format of plain-text" expect="fetchblob-dev" actual={JSON.parse(res.data).name}/>)
    done()
  })
  .catch(() => {
    report(
      <Assert key="Should successfully decode the data" expect={true} actual={false}/>)
    done()
  })

})

describe('#129 memory leaking when enable uploadProgress', (report, done) => {

  let file = null
  let count = 0

  RNFetchBlob.config({ fileCache : true })
    .fetch('GET', `${TEST_SERVER_URL}/public/6mb-dummy`)
    .then((res) => {
      file = res.path()
      for(let i=0;i<10;i++){
        RNFetchBlob.fetch('POST', `${TEST_SERVER_URL}/upload`, {
          'Transfer-Encoding' : 'Chunked'
        }, RNFetchBlob.wrap(file))
        .uploadProgress((current, total) => {})
        .then(() => {
          count ++
          if(count >= 10) {
            fs.unlink(file)
            done()
          }
        })
      }
    })

})

describe('#131 status code != 200 should not throw an error', (report, done) => {

  let count = 0
  let codes = [404, 500, 501, 403]

  codes.forEach((code) => {

    RNFetchBlob.fetch('GET', `${TEST_SERVER_URL}/xhr-code/${code}`, {
      'Cache-Control' : 'no-store'
    })
    .then(function(res) {
      report(<Assert key={`status code should be ${this}`} expect={Math.floor(this)} actual={Math.floor(res.info().status)}/>)
      count ++
      if(count >= 4)
        done()
    }.bind(code))
    .catch(function(err) {
      report(<Assert key={`status code ${this} should not cause error`} expect={true} actual={false}/>)
      count++
    }.bind(code))

  })

})
