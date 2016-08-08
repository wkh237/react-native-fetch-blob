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
const dirs = RNFetchBlob.fs.dirs

describe('Download with notification', (report, done) => {
  let filePath = null
  let filename = `test-${Date.now()}.png`

  filePath = `${dirs.DownloadDir}/${filename}`
  RNFetchBlob.config({
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
  let filename = `scannable-test-${Date.now()}.png`
  let filePath = `${dirs.DownloadDir}/${filename}`
  RNFetchBlob.config({
    path : filePath,
  })
  .fetch('GET', `${TEST_SERVER_URL}/public/github2.jpg`)
  .then((resp) => {
    tmpFilePath = resp.path()
    return RNFetchBlob.fs.scanFile([
      { path:resp.path() }
    ])
  })
  .then(() => {
    report(<Assert key={`scan image success, there should be a new file in Picture app named "${filename}"`} expect={true} actual={true}/>)
    return RNFetchBlob
            .config({
              path : dirs.DCIMDir + '/beethoven-'+ Date.now() +'.mp3'
            })
            .fetch('GET', `${TEST_SERVER_URL}/public/beethoven.mp3`)
  })
  .then((resp) => {
    fs.scanFile([{
      path : resp.path()
    }])
    .then(() => {
      report(<Assert
        key={`scan mp3 file success, there exist a new file named "beethoven-${Date.now()}.mp3" in Music app`}
        expect={true}
        actual={true}/>)
      done()
    })
  })

})

describe('android download manager', (report, done) => {
  RNFetchBlob.config({
    addAndroidDownloads : {
      useDownloadManager : true,
      title : 'RNFetchBlob test download manager test',
      description : `File description added by RNFetchblob`,
      mediaScannable : true,
      notification : true
    }
  })
  .fetch('GET', `${TEST_SERVER_URL}/public/beethoven.mp3`).then((resp) => {
    report(
      <Assert key="download manager complete handler" expect={true} actual={true}/>
    )
    return resp.readStream('ascii')
  })
  .then((stream) => {
    stream.open();
    let len = 0
    stream.onData((chunk) => {
      len += chunk.length
    })
    stream.onEnd(() => {
      report(
        <Assert key="download manager URI is readable"
          expect={len}
          comparer={Comparer.greater}
          actual={0}/>
      )
      done()
    })
  })
})

describe('open a file from intent', (report, done) => {
  let url  = null
  RNFetchBlob.config({
    addAndroidDownloads : {
      useDownloadManager : true,
      title : 'test-image',
      description : 'open it from intent !',
      mime : 'image/png',
      mediaScannable : true,
      notification : true,
    }
  })
  .fetch('GET', `${TEST_SERVER_URL}/public/github.png`)
  .then((res) => {
    let sendIntent = RNFetchBlob.android.actionViewIntent
    return sendIntent(res.path(), 'image/png')
  })
  .then(() => {
    done()
  })
})

// #75
describe('APK downloaded from Download Manager should correct', (report, done) => {

  let url  = null

  RNFetchBlob.config({
    addAndroidDownloads : {
      useDownloadManager : true,
      title : 'test-APK',
      description : 'apk install file',
      mime : 'application/vnd.android.package-archive',
      mediaScannable : true,
      notification : true,
    }
  })
  .fetch('GET', `${TEST_SERVER_URL}/public/apk-dummy.apk`)
  .then((res) => {
    let sendIntent = RNFetchBlob.android.actionViewIntent
    return sendIntent(res.path(), 'application/vnd.android.package-archive')
  })
  .then(() => {
    done()
  })

})

// issue #74
describe('download file to specific location using DownloadManager', (report, done) => {
  let dest = dirs.DCIMDir + '/android-download-test-' +Date.now() + '.png'
  RNFetchBlob.config({
    addAndroidDownloads : {
      useDownloadManager : true,
      path : dest,
      mime : 'image/png',
      title : 'android-download-path-test.png',
      description : 'download to specific path #74'
    }
  })
  .fetch('GET', `${TEST_SERVER_URL}/public/github.png`)
  .then((res) => fs.stat(res.path()))
  .then((stat) => {
    report(
      <Assert key="file exists at the path"
        expect={true} actual={true}/>,
      <Assert key="file size correct"
        expect="23975" actual={stat.size}/>)
    done()
  })
})
