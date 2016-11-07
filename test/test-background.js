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
  AsyncStorage,
  Image,
} from 'react-native';
const JSONStream = RNFetchBlob.JSONStream
const fs = RNFetchBlob.fs
const { Assert, Comparer, Info, prop } = RNTest
const describe = RNTest.config({
  group : 'background',
  run : true,
  expand : true,
  timeout : 20000,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, FILENAME, DROPBOX_TOKEN, styles } = prop()
const dirs = RNFetchBlob.fs.dirs
let prefix = ((Platform.OS === 'android') ? 'file://' : '')
let begin = Date.now()

describe('background http response', (report, done) => {
  let count = 0

  let task = RNFetchBlob.config({
    timeout : -1
  }).fetch('GET', `${TEST_SERVER_URL}/long/3600`, {
    'Cache-Control' : 'no-store'
  })

  task.expire(() => {
    done()
  })

  task.catch((err) => {
    console.log(err)
  })

  task.then((res) => {
    console.log('resp response received', res.data.length)
    // done()
  })

})
