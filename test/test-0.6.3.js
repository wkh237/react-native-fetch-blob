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
  group : '0.6.3',
  run : true,
  expand : true,
  timeout : 300000000,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, DROPBOX_TOKEN, styles } = prop()
const  dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')

describe('massive HTTP request', (report, done) => {
  try {
  let promises = []
  let progress = []
  let begin = Date.now()
  for(let i=0; i<1500;i++) {
    let p = RNFetchBlob
    .config({fileCache : true})
    .fetch('GET', `${TEST_SERVER_URL}/public/github2.jpg`)
    // .progress(function(current, total){
    //   progress[this] = current/total
    // }.bind(i))
    promises.push(p)
  }
  // let it = Timer.setInterval(() => {
  //   function pgs() {
  //     let res = []
  //     for(var i in progress) {
  //       res.push(<Text key={`download#${i}`}>{`download #${i} ${Math.floor(progress[i]*100)}%`}</Text>)
  //     }
  //     return res
  //   }
  //   report(<Info key={`progress monitor`} uid="progress">
  //     {pgs()}
  //   </Info>)
  // }, 1000)
  Promise.all(promises).then((resps) => {
    for(let i in resps) {
      fs.unlink(resps[i].path())
    }
    report(<Info key={`time = ${(Date.now() - begin) / 1000} sec`}></Info>)
    // Timer.clearInterval(it)
    done()
  })
} catch(err) {
  console.log(err)
}

})
