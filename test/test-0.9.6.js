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
  group : '0.9.6',
  run : true,
  expand : false,
  timeout : 20000,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, FILENAME, DROPBOX_TOKEN, styles } = prop()
const dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')

describe('support #141 breakpoint download', (report, done) => {
  let dest = dirs.DocumentDir + '/breakpoint.png'
  let firstChunkSize = 0

  fs.unlink(dest)
  .then(() => {

    let session = RNFetchBlob.config({
      path : dest
    })
    .fetch('GET', `${TEST_SERVER_URL}/public/github.png`, {
      'Cache-Control' : 'no-cache',
      Range : 'bytes=0-200'
    })
    .then((res) => {
      console.log(res.info())
      console.log(res.data)
      return fs.stat(res.path())
    })
    .then((stat) => {
      firstChunkSize = Math.floor(stat.size)
      console.log(firstChunkSize)
    })
    .then(() => {
      RNFetchBlob.config({
        path : dest + '?append=true'
      })
      .fetch('GET', `${TEST_SERVER_URL}/public/github.png`, {
        'Cache-Control' : 'no-cache',
        Range : 'bytes=201-'
      })
      .then((res) => {
        console.log(res.info())
        console.log(res.path())
        return fs.stat(res.path())
      })
      .then((stat) => {
        report(
          <Info key="image">
            <Image style={RNTest.prop('styles').image} source={{uri : prefix + dest}}/>
          </Info>,
          <Assert key="request data should append to existing one" expect={23975} actual={Math.floor(stat.size)}/>)
        done()
      })

    })
  })

})

describe('support download/upload progress interval and division #140 ', (report, done) => {
  let tick = 0
  let records = []
  let last = Date.now()
  RNFetchBlob.config({
    timeout : 30000
  }).fetch('GET', `${TEST_SERVER_URL}/10s-download`, {
    'Cache-Control' : 'no-store'
  })
  .progress({interval : 1000},(current, total) => {
    records.push(Date.now() - last)
    last = Date.now()
    console.log(current, '/', total, current/total)
    tick ++
  })
  .then(() => {
    let avg = 0
    for(let i in records) {
      avg+=records[i]
    }
    avg/=records.length
    report(<Assert key="interval > 900" expect={900} comparer={Comparer.smaller} actual={avg}/>)
    report(<Assert key="interval < 1200" expect={1200} comparer={Comparer.greater} actual={avg}/>)
    upload()
  })

  function upload() {
    let count = 0
    let image = RNTest.prop('image')
    RNFetchBlob.config({
      fileCache : true
    })
    .fetch('GET', `${TEST_SERVER_URL}/public/6mb-dummy`)
    .then((res) => {
      return RNFetchBlob.fetch('POST', 'https://content.dropboxapi.com/2/files/upload', {
        Authorization : `Bearer ${DROPBOX_TOKEN}`,
        'Dropbox-API-Arg': '{\"path\": \"/rn-upload/intervalTest.txt\",\"mode\": \"add\",\"autorename\": true,\"mute\": false}',
        'Content-Type' : 'application/octet-stream',
      }, RNFetchBlob.wrap(res.path()))
      .uploadProgress({count : 10, interval : -1}, (current, total) => {
        count++
        console.log(current, total)
      })
    })
    .then(() => {
      report(<Assert key="count is correct" expect={10} actual={count}/>)
      done()
    })

  }


})
