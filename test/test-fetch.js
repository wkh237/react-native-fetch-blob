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
window.File = RNFetchBlob.polyfill.File
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
  let isIOS = Platform.OS === 'ios'
  let promises = [
    // FIXME: IOS only
    // https://github.com/facebook/react-native/issues/9178
    get((res) => {
      if(isIOS)
        return res.json()
      return Promise.resolve()
    }, (data) => {
      report(<Assert key="should not convert blob to JSON (IOS only)" expect={true} actual={false} />)
    }, (err) => {
      report(<Assert key="should not convert blob to JSON (IOS only)" expect={true} actual={true} />)
    }),
    // FIXME: IOS only
    // https://github.com/facebook/react-native/issues/9178
    get((res) => {
      contentLength = res.headers['Content-Length']
      if(isIOS)
        return res.text()
      return Promise.resolve()

    }, (data) => {
      try {
        report(<Assert key="content length should correct (IOS only)" expect={Math.floor(contentLength)} actual={data ? data.length : 0} />)
      } catch(e){}
    }, (err) => {
      console.warn(err, err.stack)
    }),
    get((res) => {
      contentLength = res.headers['Content-Length']
      return res.blob()
    }, (blob) => {
      return fs.stat(blob._ref).then((stat) => {
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
    })
  ]
  Promise.all(promises).then( () => done() )

})

describe('POST different kinds of body', (report, done) => {

  let image = RNTest.prop('image')
  let tmpPath = dirs.DocumentDir + '/tmp-' + Date.now()

  function upload(desc, pBody) {
    let name = `fetch-replacement-${Platform.OS}-${Date.now()}-${Math.random()}.png`
    return pBody.then((body) =>
      fetch('https://content.dropboxapi.com/2/files/upload', {
        method : 'post',
        headers : {
          Authorization : `Bearer ${DROPBOX_TOKEN}`,
          'Dropbox-API-Arg': '{\"path\": \"/rn-upload/'+name+'\",\"mode\": \"add\",\"autorename\": true,\"mute\": false}',
          'Content-Type' : 'application/octet-stream'
        },
        body})
    )
    .then((res) => {
      return res.json()
    })
    .then((info) => {
      report(<Assert key={desc} expect={name} actual={info.name}/>)
    })
  }

  fetch(`${TEST_SERVER_URL}/public/github2.jpg`)
    .then((res) => res.blob())
    .then((b) => b.readBlob('base64'))
    .then((image) => {
      let tests = [
        upload('upload base64 encoded body', Promise.resolve(image)),
        upload('upload Blob body', Blob.build(image, 'image/png;BASE64')),
        upload('upload file path body', fs.writeFile(tmpPath, image, 'base64').then(() => {
          Promise.resolve(RNFetchBlob.wrap(tmpPath))
        }))
      ]
      Promise.all(tests).then(() => done())
    })

})

describe('Request header correctness', (report, done) => {

  let expect = {
    'hello' : 'world',
    'Content-Type' : 'application/json',
    'foo' : encodeURIComponent('福' + Date.now())
  }

  fetch(`${TEST_SERVER_URL}/xhr-header`, {
    method : 'GET',
    headers : expect
  })
  .then((res) => res.json())
  .then((actual) => {
    report(<Info key={JSON.stringify(actual)}/>)
    report(<Assert key="header field test #1" expect={expect.hello} actual={actual.hello}/>)
    report(<Assert key="header field test #2" expect={expect['content-type']} actual={actual['content-type']}/>)
    report(<Assert key="header field test #3" expect={expect.foo} actual={actual.foo}/>)
    done()
  })

})

describe('Upload form data ', (report, done) => {

  let form = new FormData()
  let expectName = 'fetch-replacement-test' + new Date()
  File
  .build('test-image.png', RNTest.prop('image'), { type : 'image/png;BASE64' })
  .then((file) => {

    form.append('name', expectName)
    form.append('file', file)
    return fetch(`${TEST_SERVER_URL}/upload-form`, {
      method : 'POST',
      body : form
    })

  })
  .then((res) => res.json())
  .then((json) => {
    report(
      <Assert key="form data verify" expect={expectName} actual={json.fields.name}/>,
      <Assert key="file size verify" expect={23975} actual={json.files[0].size}/>,
      <Assert key="form data file name verify" expect={'test-image.png'} actual={json.files[0].originalname}/>
    )
    done()
  })

})
