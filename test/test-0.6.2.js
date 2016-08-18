import RNTest from './react-native-testkit/'
import React from 'react'
import RNFetchBlob from 'react-native-fetch-blob'

import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  CameraRoll,
  Platform,
  Dimensions,
  Image,
} from 'react-native';

const fs = RNFetchBlob.fs
const { Assert, Comparer, Info, prop } = RNTest
const describe = RNTest.config({
  group : '0.6.2',
  run : true,
  expand : false,
  timeout : 30000,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, DROPBOX_TOKEN, styles } = prop()
const  dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')
let photo = null

describe('upload asset from camera roll', (report, done) => {
  let imgName = `image-from-camera-roll-${Platform.OS}-${Date.now()}.jpg`
  let tick = Date.now()
  let tick2 = Date.now()
  CameraRoll.getPhotos({first : 10})
    .then((resp) => {
      let url = resp.edges[0].node.image.uri
      console.log('CameraRoll',url)
      photo = url
      return RNFetchBlob.fetch('POST', 'https://content.dropboxapi.com/2/files/upload', {
        Authorization : `Bearer ${DROPBOX_TOKEN}`,
        'Dropbox-API-Arg': `{\"path\": \"/rn-upload/${imgName}\",\"mode\": \"add\",\"autorename\": false,\"mute\": false}`,
        'Content-Type' : 'application/octet-stream',
      }, RNFetchBlob.wrap(url))
      .uploadProgress((now, total) => {
        if(Date.now() - tick2 < 1000)
        return
        report(<Info key="upload progress" uid="pg0">
          <Text>{`upload ${now} / ${total} ${Math.floor(now/total*100)}% `}</Text>
        </Info>)
        tick2 = Date.now()
      })
    })
    .then((resp) => {
      console.log(resp)
      resp = resp.json()
      report(
        <Assert key="confirm the file has been uploaded" expect={imgName} actual={resp.name}/>
      )
      done()
    })
})

describe('Upload multipart data with file from CameraRoll', (report, done) => {
    let filename = 'test-from-storage-img-'+Date.now()+'.png'
    RNFetchBlob.fetch('POST', `${TEST_SERVER_URL}/upload-form`, {
        'Content-Type' : 'multipart/form-data',
      }, [
        { name : 'test-img', filename : filename, data: RNFetchBlob.wrap(photo)},
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
})


describe('access assets from camera roll', (report, done) => {
  let photo = null
  CameraRoll.getPhotos({first : 10})
    .then((resp) => {
      photo = resp.edges[0].node.image.uri
      report(<Info key="items">
        <Text>{photo}</Text>
      </Info>)
      return fs.readFile(photo, 'base64')
    })
    .then((data) => {
      report(<Info key="asset image">
        <Image
          style={styles.image}
          source={{uri: `data:image/png;base64, ${data}`}}/>
      </Info>)
      done()
    })
})

describe('read asset in app bundle',(report, done) => {
  let target = fs.asset('test-asset2.png')
  fs.readFile(target, 'base64')
  .then((data) => {
    report(<Info key="asset image">
      <Image
        style={styles.image}
        source={{uri: `data:image/png;base64, ${data}`}}/>
    </Info>)
    return fs.readFile(fs.asset('test-asset1.json'), 'utf8')
  })
  .then((resp) => {
    report(
      <Assert key="asset content verify"
        expect="asset#1"
        actual={JSON.parse(resp).secret}/>)
      done()
  })
})

describe('stat assets in app', (report, done) => {
  fs.stat(fs.asset('test-asset2.png'))
    .then((data) => {
      report(<Info key="list of assets">
        <Text>{JSON.stringify(data)}</Text>
      </Info>)
      done()
    })
})

describe('copy asset', (report, done) => {
  let dest = `${dirs.DocumentDir}/test-asset-1-${Date.now()}.json`
  fs.cp(fs.asset('test-asset1.json'), dest)
    .then(() => fs.readFile(dest, 'utf8'))
    .then((data) => {
      report(<Assert key="asset copied correctly"
        expect={'asset#1'}
        actual={JSON.parse(data).secret}/>)
      return fs.stat(fs.asset('test-asset1.json'))
    })
    .then((stat) => {
      report(<Assert key="file size check"
        expect={27}
        actual={Math.floor(stat.size)}/>,
      <Info key="dest file info">
        <Text>{JSON.stringify(stat)}</Text>
      </Info>)
      done()
    })
})


describe('upload file from assets',(report, done) => {
  let assetName = fs.asset('test-asset1.json')
  RNFetchBlob.fetch('POST', 'https://content.dropboxapi.com/2/files/upload', {
    Authorization : `Bearer ${DROPBOX_TOKEN}`,
    'Dropbox-API-Arg': `{\"path\": \"/rn-upload/file-from-asset-${Platform.OS}.json\",\"mode\": \"add\",\"autorename\": false,\"mute\": false}`,
    'Content-Type' : 'application/octet-stream',
  }, RNFetchBlob.wrap(assetName))
  .then((resp) => {
    resp = resp.json()
    report(
      <Assert key="file name check"
        expect={`file-from-asset-${Platform.OS}.json`}
        actual={resp.name}/>)
    done()
  })
})

describe('Check custom MIME type correctness',(report, done) => {
  RNFetchBlob
  .config({fileCache : true})
  .fetch('GET', `${TEST_SERVER_URL}/public/beethoven.mp3`)
  .then((resp) => {
    return RNFetchBlob.fetch('POST', `${TEST_SERVER_URL}/mime`, {
      'Content-Type' : 'multipart/form-data'
    }, [
      { name : 'image', filename : 'image', type : 'image/jpeg', data : RNFetchBlob.base64.encode('123456') },
      { name : 'mp3', filename : 'mp3', type : 'application/mp3', data : RNFetchBlob.base64.encode('123456') },
      { name : 'mp3', filename : 'mp3', data : RNFetchBlob.base64.encode('123456') },
      { name : 'asset', filename : 'asset.json', type: 'application/json', data : RNFetchBlob.wrap(fs.asset('test-asset1.json')) },
      { name : 'camera-roll', filename : 'cameraRoll.png', type: 'image/png', data : RNFetchBlob.wrap(photo) },
      { name : 'storage', filename : 'storage.mp3', type: 'application/mp3', data : RNFetchBlob.wrap(resp.path()) },
    ])
  })
  .then((resp) => {
    resp = resp.json()
    report(
      <Assert key="check #1 mime" expect={'image/jpeg'} actual={resp[0]} />,
      <Assert key="check #2 mime" expect={'application/mp3'} actual={resp[1]} />,
      <Assert key="check #3 mime" expect={'application/octet-stream'} actual={resp[2]} />,
      <Assert key="check #4 mime" expect={'application/json'} actual={resp[3]} />,
      <Assert key="check #5 mime" expect={'image/png'} actual={resp[4]} />,
      <Assert key="check #6 mime" expect={'application/mp3'} actual={resp[5]} />,
    )
    done()
  })
})
