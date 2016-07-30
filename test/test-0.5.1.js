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
  group : '0.5.1',
  run : true,
  expand : false,
})
const { TEST_SERVER_URL, FILENAME, DROPBOX_TOKEN, styles } = prop()

let prefix = ((Platform.OS === 'android') ? 'file://' : '')

// added after 0.5.0

let tmpFilePath = null

describe('Download file to storage with custom file extension', (report, done) => {

  RNFetchBlob.config({
      fileCache : true,
      appendExt : 'png'
    })
    .fetch('GET', `${TEST_SERVER_URL}/public/github2.jpg`)
    .then((resp) => {
      console.log(resp.path())
      tmpFilePath = resp.path()
      report(<Info key={`image from ${tmpFilePath}`}>
        <Image
          source={{ uri : prefix + tmpFilePath}}
          style={styles.image}/>
      </Info>)
      done()
    })
})

describe('Read cached file via file stream', (report, done) => {
  let data = 'data:image/png;base64, '
  fs.readStream(tmpFilePath, 'base64')
    .then((stream) => {
      stream.open()
      stream.onData((chunk) => {
        data += chunk
      })
      stream.onEnd(() => {
        report(
          <Assert key="image should have value"
            expect={0}
            comparer={Comparer.smaller}
            actual={data.length}/>,
          <Info key="image from read stream">
            <Image source={{uri : data}} style={styles.image}/>
          </Info>)
        done()
      })
      stream.onError((err) => {
        console.log('stream err', err)
      })
    })
})

describe('File stream reader error should be able to handled', (report, done) => {
  fs.readStream('^_^ not exists', 'base64')
    .then((stream) => {
      stream.open()
      stream.onError((err) => {
        report(<Info key="error message">
          <Text>
            {err}
          </Text>
        </Info>)
        done()

      })
    })
})

let localFile = null
let sysDirs = RNFetchBlob.fs.dirs
let dirs = RNFetchBlob.fs.dirs

describe('Upload from file storage', (report, done) => {
  let filename = ''
  let filepath = ''

  filename = Platform.OS + '0.5.0-' + Date.now() + '-from-storage.png'
  filepath = dirs.DocumentDir + '/' + filename
  RNFetchBlob
  .config({ path : filepath })
  .fetch('GET', `${TEST_SERVER_URL}/public/github2.jpg`)
  .then((resp) => {
      let path = resp.path()
      localFile = path
      return RNFetchBlob.fetch('POST', 'https://content.dropboxapi.com/2/files/upload', {
        Authorization : `Bearer ${DROPBOX_TOKEN}`,
        'Dropbox-API-Arg': '{\"path\": \"/rn-upload/'+filename+'\",\"mode\": \"add\",\"autorename\": true,\"mute\": false}',
        'Content-Type' : 'application/octet-stream',
      }, 'RNFetchBlob-file://' + path)
      .then((resp) => {
        resp = resp.json()
        report(
          <Assert key="confirm the file has been uploaded" expect={filename} actual={resp.name}/>
        )
        done()
      })
  })
})

describe('Upload multipart data with file from storage', (report, done) => {
  try{
    let filename = 'test-from-storage-img-'+Date.now()+'.png'
    RNFetchBlob.fetch('POST', `${TEST_SERVER_URL}/upload-form`, {
        'Content-Type' : 'multipart/form-data',
      }, [
        { name : 'test-img', filename : filename, data: 'RNFetchBlob-file://' + localFile},
        { name : 'test-text', filename : 'test-text.txt', data: RNFetchBlob.base64.encode('hello.txt')},
        { name : 'field1', data : 'hello !!'},
        { name : 'field2', data : 'hello2 !!'}
      ])
    .then((resp) => {
      resp = resp.json()
      report(
        <Assert key="check posted form data #1" expect="hello !!" actual={resp.fields.field1}/>,
        <Assert key="check posted form data #2" expect="hello2 !!" actual={resp.fields.field2}/>,
      )
      return RNFetchBlob.fetch('GET', `${TEST_SERVER_URL}/public/${filename}`)
    })
    .then((resp) => {
      report(<Info key="uploaded image">
        <Image
          style={styles.image}
          source={{ uri : 'data:image/png;base64, '+ resp.base64()}}/>
      </Info>)
      done()
    })
  } catch(err) {
    console.log(err)
  }
})

describe('Upload and download at the same time', (report, done) => {

  let content = 'POST and PUT calls with headers and body should also work correctly'
  let filename = 'download-header-test-' + Date.now()
  let body = RNFetchBlob.base64.encode(content)

  RNFetchBlob
    .config({
      fileCache : true,
    })
    .fetch('POST', 'https://content.dropboxapi.com/2/files/upload', {
      Authorization : `Bearer ${DROPBOX_TOKEN}`,
      'Dropbox-API-Arg': '{\"path\": \"/rn-upload/'+filename+'\",\"mode\": \"add\",\"autorename\": true,\"mute\": false}',
      'Content-Type' : 'application/octet-stream',
    }, body)
    .then((resp) =>  {
      return RNFetchBlob.fs.readStream(resp.path(), 'utf8')
    })
    .then((stream) => {
      let actual = ''
      stream.open()
      stream.onData((chunk) => {
        actual += chunk
      })
      stream.onEnd(() => {
        console.log('###',actual)
        report(
          <Assert
            key="response data should be the filename"
            expect={filename}
            actual={JSON.parse(actual).name} />)
        done()
      })
    })
})

describe('Session create mechanism test', (report, done) => {
  let sessionName = 'foo-' + Date.now()
  testSessionName = sessionName
  let p1 = RNFetchBlob.config({
      session : sessionName,
      fileCache : true
    })
    .fetch('GET', `${TEST_SERVER_URL}/public/github2.jpg`)
  let p2 = RNFetchBlob.config({
      fileCache : true
    })
    .fetch('GET', `${TEST_SERVER_URL}/public/github.png`)
  let p3 = RNFetchBlob.config({
      path : sysDirs.DocumentDir + '/session-test'+Date.now()+'.png'
    })
    .fetch('GET', `${TEST_SERVER_URL}/public/github.png`)

  let promises = [p1, p2, p3]
  Promise.all(promises).then((resp) => {
    let session = RNFetchBlob.session(sessionName).add(resp[1].path())
    resp[2].session(sessionName)
    let actual = session.list()
    let expect = resp.map((p) => {
      return p.path()
    })
    report(
      <Assert key="check if session state correct"
        expect={expect}
        comparer={Comparer.equalToArray}
        actual={actual} />)
    done()
  })

})

describe('Session API CRUD test', (report, done) => {

  let sessionName = 'test-session-' + Date.now()
  let baseDir = sysDirs.DocumentDir + '/' + sessionName
  fs.mkdir(sysDirs.DocumentDir + '/' + sessionName).then(() => {
    let promises = [0,1,2,3,4,5,6,7,8,9].map((p) => {
      return RNFetchBlob.config({
          session : sessionName,
          path : baseDir + '/testfile' + p
        })
        .fetch('GET', `${TEST_SERVER_URL}/public/github2.jpg`)
    })
    return Promise.all(promises)
  })
  .then((resps) => {
    let s = RNFetchBlob.session(sessionName)
    report(
      <Assert
        key="list() length validation"
        expect={10}
        actual={s.list().length}/>)
    let modified = [
      s.list()[2],
      s.list()[3],
      s.list()[4],
      s.list()[5],
      s.list()[6],
      s.list()[7],
      s.list()[8],
      s.list()[9],
    ]
    let expect = [s.list()[0], s.list()[1]]
    s.remove(s.list()[0])
    s.remove(s.list()[0])
    report(
      <Assert
        key="remove() should work correctly"
        expect={modified}
        comparer={Comparer.equalToArray}
        actual={s.list()}/>)

    s.dispose()
      .then(() => {
        return fs.ls(baseDir)
      })
      .then((lsRes) => {
        report(
          <Assert
            key="dispose() should work correctly"
            expect={expect}
            comparer={Comparer.equalToArray}
            actual={lsRes.map((p) => {
              return baseDir + '/' + p
            })}/>)
        done()
      })

  })
})
