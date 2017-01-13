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


describe('#227 IOS file modification date correctness', (report, done) => {

  let path = dirs.DocumentDir + '/issue-223-' + Date.now()
  fs.createFile(path, 'datafornow')
  .then(() => fs.stat(path))
  .then((stat) => {
    let date = stat.lastModified;
    console.log(date, stat);
    let correct = date/Date.now() > 0.95 || date/Date.now() < 1.05;
    report(<Assert key="modification date should be correct"
      expect={true} actual={correct}/>);
    done();

  })

})
