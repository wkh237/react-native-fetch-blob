import RNTest from './react-native-testkit/'
import React from 'react'
import RNFetchBlob from 'react-native-fetch-blob'
import Timer from 'react-timer-mixin'

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
  group : 'stress test',
  run : true,
  expand : true,
  timeout : 300000000,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, DROPBOX_TOKEN, styles } = prop()
const  dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')

describe('massive HTTP request', (report, done) => {

  let promises = []
  let progress = []
  let iteration = 500
  let begin = Date.now()
  let finished = 0
  let success = 0
  for(let i=0; i<iteration;i++) {
    let p = RNFetchBlob
    .config({fileCache : true})
    .fetch('GET', `${TEST_SERVER_URL}/stress/${i}`)
    .then((res) => {
      finished ++
      let info = res.info()
      if(info.status == 200 && info.headers['Content-Length'] == '23975') {
        success ++
      }
      report(<Info key={`stress progress ${success}/${finished} tests successfully completed. size=${info.headers['Content-Length']} elapsed=${Date.now() - begin}ms`} uid="stress063"/>)
      fs.unlink(res.path()).catch(() => {})
      if(finished >= iteration)
        summary()
    })
    .catch((err) => {
      finished++
      report(<Info key={err} uid="stress063-err"/>)
      if(finished >= iteration){
        summary()
      }
    })
  }

  function summary() {
    report(
      <Info key={`time = ${(Date.now() - begin) / 1000} sec`}>
        <Text>{`${success} success`}</Text>
      </Info>)
    done()
  }

})
