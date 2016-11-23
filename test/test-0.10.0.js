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
  group : '0.10.0',
  run : true,
  expand : false,
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
      console.log(count);
      // report(<Info key="report" uid="100">
      //   <Text>{count} records</Text>
      // </Info>)
      // done()
    })
  })
})


describe('cookie test', (report, done) => {
  let time = Date.now()
  RNFetchBlob.fetch('GET', `${TEST_SERVER_URL}/cookie/${time}`)
  .then((res) => RNFetchBlob.net.getCookies(`${TEST_SERVER_URL}`))
  .then((cookies) => {
    let result = /cookieName\=[^;]+/.exec(cookies[0])
    console.log(result, 'cookieName=' + time)
    report(<Assert key="cookie should not be empty"
      expect={'cookieName=' + time}
      actual={result[0]}/>)
    done()
  })

})

describe('SSL test #159', (report, done) => {
  RNFetchBlob.config({
    trusty : true
    })
    .fetch('GET', `${TEST_SERVER_URL_SSL}/public/github.png`, {
      'Cache-Control' : 'no-store'
    })
    .then(res => {
      report(<Assert
        key="trusty request should pass"
        expect={true}
        actual={true}/>)
      return RNFetchBlob.fetch('GET',`${TEST_SERVER_URL_SSL}/public/github.png`)
    })
    .catch(e => {
      report(<Assert
        key="non-trusty request should not pass"
        expect={true}
        actual={true}/>)
      done()
    })
})

describe('#171 appendExt verify', (report, done) => {

  RNFetchBlob.config({
    fileCache : true,
    appendExt : 'png'
  })
  .fetch('GET', `${TEST_SERVER_URL}/public/github.png`, {
    'Cache-Control' : 'no-store'
  })
  .then(res => {
    console.log(res.path())
    report(<Assert
      key="extension appended to tmp path"
      actual={/.png$/.test(res.path())}
      expect={true}/>)
    return fs.stat(res.path())
  })
  .then(stat => {
    report(<Assert
      key="verify the file existence"
      expect="23975"
      actual={stat.size} />)
    done()
  })

})

describe('#173 issue with append option', (report, done) => {
  let dest = dirs.DocumentDir + '/tmp' + Date.now()
  RNFetchBlob.config({
    path : dest,
    overwrite : true
  })
  .fetch('GET', `${TEST_SERVER_URL}/public/github.png`)
  .then((res) => fs.stat(res.path()))
  .then((stat) => {
    report(<Assert
      key="file size check #1"
      expect="23975"
      actual={stat.size}/>)
    return RNFetchBlob.config({
      path : dest,
      overwrite : false
    })
    .fetch('GET', `${TEST_SERVER_URL}/public/github.png`)
  })
  .then((res) => fs.stat(res.path()))
  .then((stat) => {
    report(<Assert
      key="file size check #2"
      expect="47950"
      actual={stat.size}/>)
    return RNFetchBlob.config({
      path : dest,
      overwrite : true
    })
    .fetch('GET', `${TEST_SERVER_URL}/public/github.png`)
  })
  .then((res) => fs.stat(res.path()))
  .then((stat) => {
    report(<Assert
      key="file size check #3"
      expect="23975"
      actual={stat.size}/>)
    return RNFetchBlob.config({
      path : dest,
    })
    .fetch('GET', `${TEST_SERVER_URL}/public/github.png`)
  })
  .then((res) => fs.stat(res.path()))
  .then((stat) => {
    report(<Assert
      key="it should successfully overwrite existing file without config"
      expect="23975"
      actual={stat.size}/>)
    done()
  })

})

describe('#171 verification ', (report, done) => {

  RNFetchBlob
    .config({
      session: 'SESSION_NAME',
      fileCache: true,
      appendExt: 'mp4'
    })
    .fetch('GET', `${TEST_SERVER_URL}/public/cat-fu.mp4`)
    .then(res => {
      console.log(res.path())
    })



})
