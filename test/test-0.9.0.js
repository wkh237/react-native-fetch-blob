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
window.fetch = new RNFetchBlob.polyfill.Fetch({
  auto : true,
  binaryContentTypes : ['image/', 'video/', 'audio/']
}).build()

const fs = RNFetchBlob.fs
const { Assert, Comparer, Info, prop } = RNTest
const describe = RNTest.config({
  group : '0.9.0',
  run : true,
  expand : false,
  timeout : 20000,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, FILENAME, DROPBOX_TOKEN, styles } = prop()
const dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')

describe('cache control header and range request test', (report, done) => {

  let image = RNTest.prop('image')
  let part = [
    `${fs.dirs.DocumentDir}/cache-control-test-part1.png`,
    `${fs.dirs.DocumentDir}/cache-control-test-part2.png`,
    `${fs.dirs.DocumentDir}/cache-control-test-part3.png`
  ]
  let tmp = null

  RNFetchBlob.fetch('POST', 'https://content.dropboxapi.com/2/files/upload', {
    Authorization : `Bearer ${DROPBOX_TOKEN}`,
    'Dropbox-API-Arg': '{\"path\": \"/rn-upload/'+FILENAME+'\",\"mode\": \"add\",\"autorename\": true,\"mute\": false}',
    'Content-Type' : 'application/octet-stream',
  }, image)
  .then((resp) => {
    resp = resp.json()
    report(
      <Assert key="confirm the file has been uploaded" expect={FILENAME} actual={resp.name}/>
    )
    return RNFetchBlob.config({
      path : part[0],
    })
    .fetch('GET', 'https://content.dropboxapi.com/1/files/auto/rn-upload/' + FILENAME, {
      Authorization : `Bearer ${DROPBOX_TOKEN}`,
      'Cache-Control' : 'no-store',
      'Range' : 'bytes=0-23000'
    })
  })
  .then((res) => {
    let size = Math.floor(res.info().headers['Content-Length'])
    report(<Assert key="part2 content length = 23001" expect={23001} actual={size}/>)
    return RNFetchBlob.config({
      path : part[2]
    })
    .fetch('GET', 'https://content.dropboxapi.com/1/files/auto/rn-upload/' + FILENAME, {
      Authorization : `Bearer ${DROPBOX_TOKEN}`,
      'Range' : 'bytes=23001-23975',
      'Cache-Control' : 'no-store'
    })
  })
  .then((res) => {
    let size = Math.floor(res.info().headers['Content-Length'])
    report(<Assert key="part3 content length = 975" expect={974} actual={size}/>)
    return fs.appendFile(part[0], part[2], 'uri')
  })
  .then((written) => {
    return fs.stat(part[0])
  })
  .then((stat) => {
    report(<Assert key="combined file size check" expect="23975" actual={stat.size}/>)
    done()
  })
})

describe('#73 unicode response BASE64 content test', (report, done) => {

  fetch(`${TEST_SERVER_URL}/unicode`, {
    method : 'GET'
  })
  .then((res) => {
    return res.json()
  })
  .then((data) => {
    report(<Assert key="data should correct" expect={'你好!'} actual={data.data}/>)
    done()
  })
})

describe('#73 unicode response content test', (report, done) => {
  let expect = '中文!檔案\\u00測試 ABCDE 測試'
  RNFetchBlob.config({ fileCache : true })
    .fetch('GET', `${TEST_SERVER_URL}/public/utf8-dummy`, {
      method : 'GET'
    })
    .then((res) => res.readFile('utf8'))
    .then((data) => {
      report(
        <Assert key="data should correct"
          expect={expect}
          actual={data}/>)
      done()
    })
})

describe = RNTest.config({
  group : '0.9.0',
  run : true,
  expand : true,
  timeout : 24000
})

describe('request should not retry after timed out', (report, done) => {

  let count = 0
  let task = RNFetchBlob
    .fetch('GET', `${TEST_SERVER_URL}/timeout408/${Date.now()}`)
  task.then((res) => {
    report(<Assert key="request should not success" expect={true} actual={false}/>)
  })
  .catch(() => {
    task.cancel()
    count ++
  })
  setTimeout(() => {
    report(<Assert key="request does not retry" expect={1} actual={count}/>)
    done()
  }, 12000)
})

describe = RNTest.config({
  group : '0.9.0',
  run : true,
  expand : true,
  timeout : 65000
})

describe('long live download or upload task won\'t timeout', (report, done) => {

  RNFetchBlob.config({timeout : 0})
  .fetch('GET', `${TEST_SERVER_URL}/long/`)
  .then((res) => {
    report(
      <Assert key="download not terminated" expect={true} actual={true}/>,
      <Info key={res.text()}/>)
    done()
  })

})
