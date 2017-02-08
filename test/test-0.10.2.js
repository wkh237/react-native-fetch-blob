import RNTest from './react-native-testkit/'
import React from 'react'
import _ from 'lodash'
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
  group : '0.10.2',
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
    done()

  })

})

describe('#230 add and option for setting if the request follow redirect or not', (report, done) => {

  RNFetchBlob
  .config({ followRedirect : false })
  .fetch('GET',`${TEST_SERVER_URL}/redirect`)
  .then((res) => {
    console.log(res.data)
    report(<Assert key="should not redirect twice" expect={1} actual={res.info().redirects.length}/>);
    done()
  })

})

// describe('#240 openDocument does not support file URI', (report, done) => {
//   RNFetchBlob
//   .config({ path : dirs.DocumentDir + '/app copy.png' })
//   .fetch('GET', `${TEST_SERVER_URL}/public/github.png`)
//   .then((res) => {
//     RNFetchBlob.ios.openDocument(res.path())
//     .then(() => {
//       done();
//     })
//     .catch((err) => {
//       console.log(err)
//     })
//   })
//
// })

describe('#241 null header silent failed issue', (report, done) => {

  RNFetchBlob.fetch('GET', `${TEST_SERVER_URL}/public/github.png`, {
    foo : null
  })
  .then(() => {
    report(<Assert key="null header should not crash the app"
      expect={true}
      actual={true}/>)
    done()
  })
})

describe('#247 binary data UTF8 encoding causes app crash', (report, done) => {

  RNFetchBlob
  .config({fileCache : true})
  .fetch('GET', `${TEST_SERVER_URL}/public/github.png`)
  .then((res) => fs.readStream(res.path(), 'utf8'))
  .then((stream) => {
    stream.open()
    stream.onError((err) => {
      report(<Assert
        key="read binary data to UTF8 should cause error but not crash the app"
        expect={true}
        actual={true}/>)
      done()
    })
  })

})


describe('#248 create blob from file has spaces in filename', (report, done) => {

  let source = '',
      size = 0,
      path = 'archive image.zip'
  RNFetchBlob
  .config({path : fs.dirs.DocumentDir +'/' + path})
  .fetch('GET', `${TEST_SERVER_URL}/public/issue-248-dummy.zip`)
  .then((res) => {
    source = res.path();
    console.log('source=', source)
    window.Blob = RNFetchBlob.polyfill.Blob;
    return Blob.build(RNFetchBlob.wrap(source), { type : 'application/zip'})
  })
  .then((b) => {
    console.log(b)
    size = b.size
    return fs.stat(b._ref)
  })
  .then((stat) => {
    report(<Assert key="blob created without error"
      expect={stat.size} actual={size}/>)
    return RNFetchBlob.fetch('POST',
    `${TEST_SERVER_URL}/upload-form`,
    {
      'Content-Type' : 'multipart/form-data'
    }, [
      {
        name : 'file',
        filename : 'file name '+Platform.OS+'.zip',
        type : 'application/zip',
        data : RNFetchBlob.wrap(source)
      }
    ])
  })
  .then(() => {
    done()
  })

})
