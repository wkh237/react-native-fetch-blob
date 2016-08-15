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


describe('fs.slice test', (report, done) => {

  let source = null
  let parts = fs.dirs.DocumentDir + '/tmp-source-'
  let dests = []
  let combined = fs.dirs.DocumentDir + '/combined-' + Date.now() + '.jpg'
  let size = 0

  window.fetch = new RNFetchBlob.polyfill.Fetch({
    auto : true,
    binaryContentTypes : ['image/', 'video/', 'audio/']
  }).build()

  fetch(`${TEST_SERVER_URL}/public/github2.jpg`)
  .then((res) => res.rawResp())
  .then((res) => {
    source = res.path()
    return fs.stat(source)
  })
  // separate file into 4kb chunks
  .then((stat) => {
    size = stat.size
    let promise = Promise.resolve()
    let cursor = 0
    while(cursor < size) {
      promise = promise.then(function(start) {
        console.log('slicing part ', start , start + 40960)
        let offset = 0
        return fs.slice(source, parts + start, start + offset, start + 40960)
                .then((dest) => {
                  console.log('slicing part ', start + offset, start + 40960, 'done')
                  dests.push(dest)
                  return Promise.resolve()
                })
      }.bind(this, cursor))
      cursor += 40960
    }
    console.log('loop end')
    return promise
  })
  // combine chunks and verify the result
  .then(() => {
    console.log('combinding files')
    let p = Promise.resolve()
    for(let d in dests) {
      p = p.then(function(chunk){
        return fs.appendFile(combined, chunk, 'uri').then((write) => {
          console.log(write, 'bytes write')
        })
      }.bind(this, dests[d]))
    }
    return p.then(() => fs.stat(combined))
  })
  .then((stat) => {
    report(
      <Assert key="verify file size" expect={size} actual={stat.size}/>,
      <Info key="image viewer">
        <Image key="combined image" style={styles.image} source={{ uri : prefix + combined}}/>
      </Info>)
    done()
  })

})
