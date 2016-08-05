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

window.Blob = RNFetchBlob.polyfill.Blob
window.fetch = new RNFetchBlob.polyfill.Fetch({
  auto : true,
  binaryContentTypes : ['image/', 'video/', 'audio/']
}).build()

const fs = RNFetchBlob.fs
const { Assert, Comparer, Info, prop } = RNTest
const describe = RNTest.config({
  group : 'Fetch polyfill',
  run : true,
  expand : true,
  timeout : 10000,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, FILENAME, DROPBOX_TOKEN, styles } = prop()
const dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')

describe('GET request test : unicode text -> any', (report, done) => {

  function get(fn1, fn2) {
    return fetch(`${TEST_SERVER_URL}/unicode`, { method : 'GET'})
    .then((res) => fn1(res))
    .then((data) => fn2(data))
  }

  let promises =
  [
    get((res) => res.json(), (json) => {
      report(<Assert key="json data correct" expect={'你好!'} actual={json.data}/>)
    }),
    get((res) => res.text(), (text) => {
      report(<Assert key="text data correct" expect={'你好!'} actual={JSON.parse(text).data}/>)
    }),
    get((res) => res.blob(), (blob) => {
      return blob.readBlob('utf8').then((text) => {
        report(<Assert key="blob data correct" expect={'你好!'} actual={JSON.parse(text).data}/>)
      })
    }),
    // get((res) => res.arrayBuffer(), (text) => {
    //   report(<Assert key="text data correct" expect={'你好!'} actual={JSON.parse(text).data}/>)
    // })
  ]

  Promise.all(promises).then(() => {
    done()
  })

})

describe('GET request test : path -> any', (report, done) => {

  function get(fn1, fn2, fn3) {
    fetch(`${TEST_SERVER_URL}/public/github.png`, { method : 'GET'})
      .then((res) => fn1(res))
      .then((data) => fn2(data))
      .catch((err) => fn3(err))
  }
  let contentLength = 0
  let promises = [
    get((res) => res.json(), (data) => {
      report(<Assert key="should not convert blob to JSON" expect={true} actual={false} />)
    }, (err) => {
      report(<Assert key="should not convert blob to JSON" expect={true} actual={true} />)
    }),
    get((res) => {
      contentLength = res.headers['Content-Length']
      return res.text()
    }, (data) => {
      report(
        <Assert key="should convert blob to text" expect={true} actual={true} />,
        <Assert key="content length should correct" expect={Math.floor(contentLength)} actual={data.length} />)
    }, (err) => {
      console.warn(err, err.stack)
      report(<Assert key="should convert blob to text" expect={true} actual={false} />)
    }),
    get((res) => {
      contentLength = res.headers['Content-Length']
      return res.blob()
    }, (blob) => {
      return fs.stat(blob.getRNFetchBlobRef()).then((stat) => {
        report(<Assert key="stored file size correct" expect={contentLength} actual={stat.size} />)
        return blob.readBlob('base64')
      })
      .then((b64) => {
        report(<Info key="stored image">
          <Image style={styles.image} source={{uri : 'data:image/png;BASE64 ,' + b64}}/>
        </Info>)
      })

    }, (err) => {
      console.warn(err, err.stack)
      report(<Assert key="should convert blob to blob" expect={true} actual={false} />)
    })
  ]
  Promise.all(promises).then( () => done() )

})

describe('POST base64 body auto strategy', (report, done) => {

  let image = RNTest.prop('image')
  let tmpPath = dirs.DocumentDir + '/tmp-' + Date.now()

  function upload(desc, method, pBody) {
    let name = `fetch-replacement-${Platform.OS}-${Date.now()}.png`
    return pBody.then((body) =>
      fetch('https://content.dropboxapi.com/2/files/upload', {
        method : method,
        headers : {
          Authorization : `Bearer ${DROPBOX_TOKEN}`,
          'Dropbox-API-Arg': '{\"path\": \"/rn-upload/'+name+'\",\"mode\": \"add\",\"autorename\": true,\"mute\": false}',
          'Content-Type' : 'application/octet-stream'
        },
        body : body
      })
    )
    .then((res) => {
      return res.json()
    })
    .then((info) => {
      report(<Assert key={desc} expect={name} actual={info.name}/>)
    })
  }

  let tests = [
    upload('upload base64 encoded body', 'post', Promise.resolve(image)),
    upload('upload Blob body', 'post', Blob.build(image, 'image/png;BASE64')),
    upload('upload file path body', 'post', fs.writeFile(tmpPath, image, 'base64').then(() => Promise.resolve(RNFetchBlob.wrap(tmpPath))))
  ]

  Promise.all(tests).then(() => done())


})
