import RNTest from './react-native-testkit/'
import React from 'react'
import _ from 'lodash'
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
  group : '0.10.3',
  run : true,
  expand : true,
  timeout : 20000,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, FILENAME, DROPBOX_TOKEN, styles } = prop()
const dirs = RNFetchBlob.fs.dirs
let prefix = ((Platform.OS === 'android') ? 'file://' : '')
let begin = Date.now()


describe('#230 #249 cookies manipulation', (report, done) => {

  RNFetchBlob
  .fetch('GET', `${TEST_SERVER_URL}/cookie/249230`)
  .then((res) => RNFetchBlob.net.getCookies())
  .then((cookies) => {
    console.log(cookies)
    report(<Assert
      key="should set 10 cookies"
      expect={10}
      actual={cookies['localhost'].length}/>)
    return RNFetchBlob.fetch('GET', `${TEST_SERVER_URL}/cookie-echo`)
  })
  .then((res) => {
    console.log(res.data)
    let cookies = String(res.data).split(';')
    report(<Assert
      key="should send 10 cookies"
      expect={10}
      actual={cookies.length}/>)
    return RNFetchBlob.net.removeCookies()
  })
  .then(() => RNFetchBlob.net.getCookies('localhost'))
  .then((cookies) => {
    report(<Assert
      key="should have no cookies"
      expect={undefined}
      actual={cookies['localhost']}/>)
    return RNFetchBlob.fetch('GET', `${TEST_SERVER_URL}/cookie-echo`)
  })
  .then((res) => {
    console.log(res.data)
    let cookies = String(res.data).split(';')
    cookies = _.reject(cookies, r => r.length < 2)
    report(<Assert
      key="should send no cookies"
      expect={0}
      actual={cookies.length}/>)
    done()
  })

})
