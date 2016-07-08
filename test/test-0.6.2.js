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
  timeout : 12000,
})
const { TEST_SERVER_URL_SSL, DROPBOX_TOKEN, styles } = prop()
const  dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')

describe('upload asset from camera roll', (report, done) => {
  let imgName = `image-from-camera-roll-${Platform.OS}.jpg`
  CameraRoll.getPhotos({first : 10})
    .then((resp) => {
      let url = resp.edges[0].node.image.uri
      return fs.readFile(url, 'base64')
    })
    .then((data) => {
      return RNFetchBlob.fetch('POST', 'https://content.dropboxapi.com/2/files/upload', {
        Authorization : `Bearer ${DROPBOX_TOKEN}`,
        'Dropbox-API-Arg': `{\"path\": \"/rn-upload/${imgName}\",\"mode\": \"add\",\"autorename\": false,\"mute\": false}`,
        'Content-Type' : 'application/octet-stream',
      }, data)
    })
    .then((resp) => {
      resp = resp.json()
      report(
        <Assert key="confirm the file has been uploaded" expect={imgName} actual={resp.name}/>
      )
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
