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
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, FILENAME, DROPBOX_TOKEN, styles } = prop()
const  dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')

describe('fs URI encoding support', (report, done) => {

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

describe('request timeout working properly', (report, done) => {
  RNFetchBlob.config({ timeout : 1000 })
  .fetch('GET', `${TEST_SERVER_URL}/timeout`)
  .then(() => {
    report(
      <Assert
        key="should not execute successfully"
        expect={true}
        actual={false}/>)
    done()
  })
  .catch((err) => {
    report(
      <Assert
        key="expect timeout error"
        expect={true}
        actual={/timed out/ig.test(err)}/>)
    done()
  })
})

describe('regular request should have correct body', (report, done) => {
  RNFetchBlob
  .fetch('POST', `${TEST_SERVER_URL}/echo`, {
    'content-type' :  'text/foo',
    foo : 'bar'
  }, 'foo is bar')
  .then((res) => {
    report(
      <Assert key="check headers"
        expect={'bar'}
        actual={res.json().headers.foo}/>,
      <Assert key="check content type"
        expect={'text/foo'}
        actual={res.json().headers['content-type']}/>,
      <Assert key="check body"
        expect={'foo is bar'}
        actual={res.json().body}/>)
    done()
  })
})

describe('automatic content conversion test', (report, done) => {
    let expect1 = `test-alpha-${Date.now()}`
    let expect2 = `test-beta-${Date.now()}`

    RNFetchBlob.fetch('POST', `${TEST_SERVER_URL}/echo`, {
      'Content-Type' : 'application/octet-foo',
    }, RNFetchBlob.base64.encode(expect1))
    .then((res) => {
      report(
        <Assert key="request body should be decoded by BASE64 decoder"
          expect={expect1}
          actual={res.json().body}/>)
      return fs.writeFile(dirs.DocumentDir + '/test-0.8.0-auto', expect2, 'utf8')
    })
    .then(() => RNFetchBlob.fetch('POST', `${TEST_SERVER_URL}/echo`, {
        /* what ever the header is */
    }, RNFetchBlob.wrap(dirs.DocumentDir + '/test-0.8.0-auto')))
    .then((resp) => {
      report(
        <Assert key="request body should send from storage"
          expect={expect2}
          actual={resp.json().body}/>)
      done()
    })
})

function getASCIIArray(str) {
  let r = []
  for(let i=0;i<str.length;i++) {
    r.push(str[i].charCodeAt(0))
  }
  return r
}
