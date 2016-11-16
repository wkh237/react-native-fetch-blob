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
  BackAndroid,
  AsyncStorage,
  Image,
} from 'react-native';

window.XMLHttpRequest = RNFetchBlob.polyfill.XMLHttpRequest
window.Blob = RNFetchBlob.polyfill.Blob

const JSONStream = RNFetchBlob.JSONStream
const fs = RNFetchBlob.fs
const { Assert, Comparer, Info, prop } = RNTest
const describe = RNTest.config({
  group : '0.10.1',
  run : true,
  expand : true,
  timeout : 20000,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, FILENAME, DROPBOX_TOKEN, styles } = prop()
const dirs = RNFetchBlob.fs.dirs
let prefix = ((Platform.OS === 'android') ? 'file://' : '')
let begin = Date.now()

describe('#177 multipart upload event only triggers once', (report, done) => {

  try{
    let localFile = null
    let filename = 'dummy-'+Date.now()
    RNFetchBlob.config({
      fileCache : true
    })
    .fetch('GET', `${TEST_SERVER_URL}/public/6mb-dummy`)
    .then((res) => {
      localFile = res.path()
      return RNFetchBlob.fetch('POST', `${TEST_SERVER_URL}/upload-form`, {
          'Content-Type' : 'multipart/form-data',
        }, [
          { name : 'test-img', filename : filename, data: 'RNFetchBlob-file://' + localFile},
          { name : 'test-text', filename : 'test-text.txt', data: RNFetchBlob.base64.encode('hello.txt')},
          { name : 'field1', data : 'hello !!'},
          { name : 'field2', data : 'hello2 !!'}
        ])
        .uploadProgress({ interval : 100 },(now, total) => {
          console.log(now/total)
        })
    })
    .then((resp) => {
      resp = resp.json()
      report(
        <Assert key="check posted form data #1" expect="hello !!" actual={resp.fields.field1}/>,
        <Assert key="check posted form data #2" expect="hello2 !!" actual={resp.fields.field2}/>,
      )
      return RNFetchBlob.fetch('GET', `${TEST_SERVER_URL}/public/${filename}`)
    })
    .then((resp) => {
      report(<Info key="uploaded image">
        <Image
          style={styles.image}
          source={{ uri : 'data:image/png;base64, '+ resp.base64()}}/>
      </Info>)
      done()
    })
  } catch(err) {
    console.log(err)
  }
})
