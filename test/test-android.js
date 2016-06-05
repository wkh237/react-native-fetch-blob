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
  group : 'Android only functions',
  run : Platform.OS === 'android',
  expand : false,
})
const { TEST_SERVER_URL, FILENAME, DROPBOX_TOKEN, styles } = prop()

let prefix = ((Platform.OS === 'android') ? 'file://' : '')

// Android only tests

let tmpFilePath = null

describe('Download with notification', (report, done) => {
  let filePath = null
  let filename = `test-${Date.now()}.png`
  RNFetchBlob.fs.getSystemDirs().then((dirs) => {
    filePath = `${dirs.DownloadDir}/${filename}`
    return RNFetchBlob.config({
        path : filePath,
        addAndroidDownloads : {
          title : 'RNFetchBlob test download success',
          description : `File description added by RNFetchblob`,
          mediaScannable : true,
          mime : "image/png",
          notification : true
        }
      })
      .fetch('GET', `${TEST_SERVER_URL}/public/github2.jpg`)
  })
  .then((resp) => {
    tmpFilePath = resp.path()
    report(<Info key={`image from ${tmpFilePath}`}>
      <Image
        source={{ uri : prefix + tmpFilePath}}
        style={styles.image}/>
    </Info>)
    done()
  })

})

describe('MediaScanner tests ', (report, done) => {
  let filePath = null
  let filename = `scannable-test-${Date.now()}.png`
  RNFetchBlob.fs.getSystemDirs().then((dirs) => {
    filePath = `${dirs.DownloadDir}/${filename}`
    return RNFetchBlob.config({
        path : filePath,
      })
      .fetch('GET', `${TEST_SERVER_URL}/public/github2.jpg`)
  })
  .then((resp) => {
    tmpFilePath = resp.path()
    RNFetchBlob.fs.scanFile([
      { path:resp.path() }
    ])
    .then(() => {
      report(<Assert key="scan success" expect={true} actual={true}/>)
      done()
    })
  })

})
