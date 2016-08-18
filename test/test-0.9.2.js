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
  group : '0.9.2',
  run : true,
  expand : true,
  timeout : 20000,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, FILENAME, DROPBOX_TOKEN, styles } = prop()
const dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')

describe('content-length header test', (report, done) => {
  RNFetchBlob.fetch('POST', `${TEST_SERVER_URL}/content-length`, {
    'Content-Type' : 'text/plain',
    'Content-Length' : '5'
  }, 'hello')
  .then((res) => {
    report(
      <Info key="response data">
        <Text>{res.text()}</Text>
      </Info>)
    done()
  })
})

describe('slice test', (report, done) => {
  let str = "PASSSTRING"
  let tmp = fs.dirs.DocumentDir + '/slice-tmp-'
  let testData = [
       {start:   4, contents: "STRING"},
       {start:  12, contents: ""},
       {start: 0, end:   4, contents: "PASS"},
       {start: 0, end:  12, contents: "PASSSTRING"},
       {start: 7, end:   4, contents: ""},
       {start:  -6, contents: "STRING"},
       {start: -12, contents: "PASSSTRING"},
       {start: 0, end:  -6, contents: "PASS"},
       {start: 0, end: -12, contents: ""},
     ]
  fs.writeFile(tmp, str, 'utf8')
    .then(() => {
      let promises = []
      for(let t in testData) {
        let p = fs.slice(tmp, tmp + t, testData[t].start, testData[t].end)
        .then(function(num) {
          console.log('slice finished', num)
          return fs.readFile(tmp + num, 'utf8')
          .then((data) => {
            report(<Assert key={`assertion-${num}`} expect={testData[num].contents} actual={data}/>)
            return Promise.resolve()
          })
        }.bind(this, t))
        promises.push(p)
      }
      Promise.all(promises).then((res) => {
        done()
      })

    })
})

describe('Upload multipart/form-data', (report, done) => {
  let image = RNTest.prop('image')
  RNFetchBlob.fetch('POST', `${TEST_SERVER_URL}/upload-form`, {
      Authorization : "Bearer fsXcpmKPrHgAAAAAAAAAEGxFXwhejXM_E8fznZoXPhHbhbNhA-Lytbe6etp1Jznz",
      'Content-Type' : 'multipart/form-data',
    }, [
      { name : 'test-img', filename : 'test-img.png', data: image},
      { name : 'test-text', filename : 'test-text.txt', data: RNFetchBlob.base64.encode('hello.txt')},
      { name : 'field1', data : 'hello !!'},
      { name : 'field2', data : 'hello2 !!'}
    ])
  .then((resp) => {
    console.log(resp.json())
    resp = resp.json()

    report(
      <Assert key="check posted form data #1" expect="hello !!" actual={resp.fields.field1}/>,
      <Assert key="check posted form data #2" expect="hello2 !!" actual={resp.fields.field2}/>,
    )
    done()
  })
})

describe('app should not crash when sending formdata without data field', (report, done) => {

  RNFetchBlob.fetch('POST', `${TEST_SERVER_URL}/upload-form`, {
      Authorization : "Bearer fsXcpmKPrHgAAAAAAAAAEGxFXwhejXM_E8fznZoXPhHbhbNhA-Lytbe6etp1Jznz",
      'Content-Type' : 'multipart/form-data',
    }, [
      { name : 'empty-file', filename : 'test-img.png'},
      { name : 'empty-data'},
      { name : 'field2', data : 'hello2 !!'}
    ])
  .then((resp) => {
    console.log(resp.json())
    resp = resp.json()

    report(
      <Assert key="check posted form data #1" expect={undefined} actual={resp.fields['empty-file']}/>,
      <Assert key="check posted form data #2" expect={undefined} actual={resp.fields['empty-data']}/>,
      <Assert key="check posted form data #3" expect="hello2 !!" actual={resp.fields.field2}/>,
    )
    done()
  })
})
