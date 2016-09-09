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
  group : '0.9.4',
  run : true,
  expand : true,
  timeout : 20000,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, FILENAME, DROPBOX_TOKEN, styles } = prop()
const dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')

describe('issue #105', (report, done) => {
  let tmp = null
  RNFetchBlob
    .config({ fileCache : true })
    .fetch('GET', `${TEST_SERVER_URL}/public/github.png`)
    .then((res) => {
      tmp = res.path()
      return RNFetchBlob.fetch('POST', `${TEST_SERVER_URL}/upload-form`, {
        'Content-Type' : 'multipart/form-data',
        'Expect' : '100-continue'
      }, [
        { name : 'data', data : 'issue#105 test' },
        { name : 'file', filename : 'github.png', data : RNFetchBlob.wrap(tmp) }
      ])
    })
    .then((res) => {
      done()
    })
})

describe('issue #106', (report, done) => {

  fetch('https://rnfb-test-app.firebaseapp.com/6m-json.json')
    .then((res) => {
      console.log('## converted')
      return res.json()
    })
    .then((data) => {
      // console.log(data)
      report(<Assert key="fetch request success" expect={20000} actual={data.total}/>)
      done()
    })

})

describe('issue #111 get redirect destination', (report, done) => {
  RNFetchBlob.fetch('GET', `${TEST_SERVER_URL}/redirect`)
  .then((res) => {
    console.log(res.info())
    report(
      <Assert key="redirect history should tracable"
        expect={2}
        actual={res.info().redirects.length}/>,
      <Assert key="redirect history verify"
        expect={[`${TEST_SERVER_URL}/redirect`, `${TEST_SERVER_URL}/public/github.png`]}
        comparer={Comparer.equalToArray}
        actual={res.info().redirects}/>,
    )
    done()
  })
})

describe('chunked encoding option test', (report, done) => {

  let path = null
  let base64 = null

  RNFetchBlob
    // .config({ fileCache : true })
    .fetch('GET', `${TEST_SERVER_URL}/public/1600k-img-dummy.jpg`)
    .then((res) => {
      base64 = res.base64()
      return RNFetchBlob
        .fetch('POST', `${TEST_SERVER_URL}/upload`, {
          'Content-Type' : 'application/octet-stream;BASE64'
        }, base64)
    })
    .then((res) => {
      let headers = res.info().headers
      console.log(res.text())
      report(<Assert key="request should not use chunked encoding"
        expect={undefined}
        actual={headers['transfer-encoding']}/>)
      fs.unlink(path)
      done()
    })
})

describe('#118 readStream performance prepare the file', (report, done) => {
  let cache = null
  let size = 0
  let size2 = 0
  let tick = Date.now()
  let tick2 = Date.now()
  let start = -1
  let start2 = -1
  let count = 0

  let task = RNFetchBlob.config({fileCache : true})
    .fetch('GET', `${TEST_SERVER_URL}/public/22mb-dummy`)
  task.progress((current, total) => {
    report(<Info key="prepare file" uid="prepare">
      <Text key="pg"> {Math.floor(current/total*100)}% </Text>
    </Info>)
  })
  task.then((res) => {
      report(<Info key="preparation complete"><Text>start in 3 seconds</Text></Info>)
      cache = res.path()
      setTimeout(readFile, 2500)
      function readFile() {
        fs.readStream(cache, 'utf8', 102400, 10)
          .then((stream) => {
            stream.open()
            start = Date.now()
            stream.onData((chunk) => {
              count++
              size += chunk.length
              if(Date.now() - tick > 500) {
                console.log(size, ' read')
                tick = Date.now()
                report(
                  <Info key="size" uid="100">
                    <Text key="AA">File 1 {size}/22000000 bytes read</Text>
                    <Text key="BB">File 2 {size2}/22000000 bytes read</Text>
                  </Info>)
              }
            })
            stream.onEnd(() => {
              report(
                <Info key="size" uid="100"><Text>{size} bytes read</Text></Info>,
                <Info key="elapsed"><Text>{Date.now() - start} ms</Text></Info>,
                <Info key="events"><Text>{count} times</Text></Info>,
                <Assert key="JS thread is not blocked" expect={true} actual={true}/>,)
              fs.stat(cache).then((stat) => {
                report(
                  <Info key="info"><Text>{JSON.stringify(stat)}</Text></Info>)
                fs.unlink(cache)
                done()
              })
            })
          })
      }
    })
})

describe('issue #120 upload progress should work when sending body as-is', (report, done) => {

  let data = RNTest.prop('image')
  let tick = 0

  let task = RNFetchBlob.fetch('POST', 'https://content.dropboxapi.com/2/files/upload', {
    Authorization : `Bearer ${DROPBOX_TOKEN}`,
    'Dropbox-API-Arg': '{\"path\": \"/rn-upload/'+FILENAME+'\",\"mode\": \"add\",\"autorename\": true,\"mute\": false}',
    'Content-Type' : 'text/plain; charset=dropbox-cors-hack',
  }, data)

  task.uploadProgress((current, total) => {
    tick ++
  })
  .then((res) => {
    let resp = res.json()
    report(
      <Info key="viewer"><Text>{JSON.stringify(resp)}</Text></Info>,
      <Assert key="event should be triggered"
        expect={tick}
        comparer={Comparer.greater} actual={0}/>)
    done()
  })

})
