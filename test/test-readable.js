import RNTest from './react-native-testkit/'
import React from 'react'
import RNFetchBlob from 'react-native-fetch-blob'
import Timer from 'react-timer-mixin'

import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  CameraRoll,
  Platform,
  Dimensions,
  Image,
} from 'react-native';

import EventEmitter from 'EventEmitter'

const fs = RNFetchBlob.fs

const Readable = RNFetchBlob.polyfill.Readable
const { Assert, Comparer, Info, prop } = RNTest
const describe = RNTest.config({
  group : 'Blob',
  run : true,
  expand : false,
  timeout : 20000,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, DROPBOX_TOKEN, styles } = prop()
const  dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')
let file = RNTest.prop('image')

describe('first test', (report, done) => {
  let e = new EventEmitter()
  console.log(e)
  e.addListener('aaa', (data) => { console.log(data) })
  e.emit('aaa', 123)
})
