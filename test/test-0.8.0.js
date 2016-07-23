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

const fs = RNFetchBlob.fs
const { Assert, Comparer, Info, prop } = RNTest
const describe = RNTest.config({
  group : '0.8.0',
  run : true,
  expand : true,
  timeout : 10000,
})
const { TEST_SERVER_URL_SSL, FILENAME, DROPBOX_TOKEN, styles } = prop()
const  dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')

describe('URI encoding support', (report, done) => {

  let testData1 = `test date write file from file ${Date.now()}`
  let testData2 = `test date write file from file ${Date.now()*Math.random()}`
  let file1 = dirs.DocumentDir + '/testFiletFile1' + Date.now()
  let file2 = dirs.DocumentDir + '/testFiletFile2' + Date.now()
  let init = [fs.createFile(file1, testData1, 'utf8'),
              fs.createFile(file2, testData2, 'utf8')]
  Promise.all(init)
    .then(() => fs.appendFile(file1, file2, 'uri'))
    .then(() => fs.readFile(file1, 'utf8'))
    .then((data) => {
      report(
        <Assert key="append content from URI should be correct"
          expect={testData1 + testData2}
          actual={data}
        />)
      return fs.writeFile(file1, file2, 'uri')
    })
    .then(() => fs.readFile(file1, 'utf8'))
    .then((data) => {
      report(
        <Assert key="write content from URI should be correct"
          expect={testData2}
          actual={data}
        />)
      done()
    })

})
// 
// describe('automatic response data handing test', (report, done) => {
//
//
//
// })

function getASCIIArray(str) {
  let r = []
  for(let i=0;i<str.length;i++) {
    r.push(str[i].charCodeAt(0))
  }
  return r
}
