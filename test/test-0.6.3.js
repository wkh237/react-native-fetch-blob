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

false && describe('massive HTTP request', (report, done) => {
  return
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

})

RNTest.config({
  group : '0.7.0',
  run : true,
  expand : false,
  timeout : 600000,
})('Upload and download large file', (report, done) => {
  let filename = '22mb-dummy-' + Date.now()
  let begin = -1
  let begin2 = -1
  let deb = Date.now()
  RNFetchBlob.config({
    fileCache : true
  })
  .fetch('GET', `${TEST_SERVER_URL}/public/22mb-dummy`)
  .progress((now, total) => {
    if(begin === -1)
      begin = Date.now()
    if(Date.now() - deb < 1000)
      return
    deb = Date.now()
    report(<Info uid="200" key="progress">
      <Text>
        {`download ${now} / ${total} bytes (${Math.floor(now / (Date.now() - begin))} kb/s)`}
      </Text>
    </Info>)
  })
  .then((res) => {
    try {
    deb = Date.now()
    // let promise =  RNFetchBlob.fetch('POST', `${TEST_SERVER_URL}/raw`, {
    let promise =  RNFetchBlob.fetch('POST', 'https://content.dropboxapi.com/2/files/upload', {
      Authorization : `Bearer ${DROPBOX_TOKEN}`,
      'Dropbox-API-Arg': '{\"path\": \"/rn-upload/'+filename+'\",\"mode\": \"add\",\"autorename\": true,\"mute\": false}',
      'Content-Type' : 'application/octet-stream',
    }, RNFetchBlob.wrap(res.path()))
    promise.uploadProgress((now, total) => {
      if(Date.now() - deb < 1000)
        return
      deb = Date.now()
      if(begin2 === -1)
        begin2 = Date.now()
      let speed = Math.floor(now / (Date.now() - begin2))
      report(<Info uid="100"  key="progress">
        <Text>
          {`upload ${now} / ${total} bytes (${speed} kb/s)`}
          {` ${Math.floor((total-now)/speed/1000)} seconds left`}
        </Text>
      </Info>)
    })
    return promise
  } catch(err) { console.log(err) }
  })
  .then((res) => {
    report(<Assert
      key="upload should success without crashing app"
      expect={filename}
      actual={res.json().name}/>)
    done()
  })
})
