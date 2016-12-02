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

describe("Invalid promise.resolve call after task is canceled #176", (report, done) => {

  let task = RNFetchBlob.fetch('GET', `${TEST_SERVER_URL}/public/22mb-dummy`)

  task
  .then(() => {
    report(<Assert key="Promise should not resolved" expect={true} actual={false}/>);
  })

  .catch(() => {
    report(<Assert key="Promise should not resolved" expect={true} actual={true}/>);
    done()
  });

  task.progress((current, total) => {
    report(<Info key={`${Math.floor(current/1024)}kb of ${Math.floor(total/1024)}kb`} uid="report"/>)
  })

  setTimeout(() => {
    task.cancel();
  }, 2000)

})

describe('passing empty value to fs.lstat doest not crash the app #205', (report, done) => {
  let path = fs.dirs.DocumentDir +'/testfile' + Date.now()
  fs.createFile(path, path, 'utf8')
    .then(() => fs.lstat(null))
    .catch(() => {
      done()
    })
})

describe('media scanner test #203', (report, done) => {

  RNFetchBlob
  .config({ path : fs.dirs.DownloadDir +'/#203-'+Date.now()+'.png' , appendExt : 'png' })
  .fetch('GET', `${TEST_SERVER_URL}/public/github.png`)
  .then((res) => {
    console.log(res.path())
    fs.scanFile([ { path : res.path() } ])
  })
  .then(() => {
    done()
  })

})
