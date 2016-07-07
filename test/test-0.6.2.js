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
  expand : true,
  timeout : 12000,
})
const { TEST_SERVER_URL_SSL, FILENAME, DROPBOX_TOKEN, styles } = prop()
const  dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')


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
  let target = 'bundle-assets://test-asset2.png'
  fs.readFile(target, 'base64')
  .then((data) => {
    report(<Info key="asset image">
      <Image
        style={styles.image}
        source={{uri: `data:image/png;base64, ${data}`}}/>
    </Info>)
    return fs.readFile('bundle-assets://test-asset1.json', 'utf8')
  })
  .then((resp) => {
    report(
      <Assert key="asset content verify"
        expect="asset#1"
        actual={JSON.parse(resp).secret}/>)
      done()
  })
})
