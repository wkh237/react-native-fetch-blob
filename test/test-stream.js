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
  group : 'streaming',
  run : true,
  expand : true,
  timeout : 20000,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, FILENAME, DROPBOX_TOKEN, styles } = prop()
const dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')

describe('#143 streaming', (report, done) => {
  let count = 0
  let last = null
  RNFetchBlob.fetch('GET', `${TEST_SERVER_URL}/video/150`, {
    'Cache-Control' : 'no-store'
  })
    .part((chunk) => {
      console.log('part', ++count, chunk.length)
      last = chunk
      report(<Info key="stream viewr" uid="100">
        <Image key="frame"  style={{ height : 256, width : 256 }} source={{uri :'data:image/jpeg;base64,' + chunk}}/>
      </Info>)
    })
    .then((res) => {
      done()
    })

})
