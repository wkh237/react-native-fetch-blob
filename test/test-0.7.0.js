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
  group : '0.7.0',
  run : true,
  expand : false,
  timeout : 300000000,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, DROPBOX_TOKEN, styles } = prop()
const  dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')
let bigfile = null

describe('Upload and download large file', (report, done) => {
  let filename = Platform.OS+'-0.7.0-22mb-dummy-' + Date.now()
  let begin = -1
  let begin2 = -1
  let deb = Date.now()
  let download = false, upload = false
  RNFetchBlob.config({
    fileCache : true
  })
  .fetch('GET', `${TEST_SERVER_URL}/public/2mb-dummy`)
  .progress((now, total) => {
    download = true
    if(begin === -1)
      begin = Date.now()
    if(Date.now() - deb < 1000)
      return
    deb = Date.now()
    console.log('download', now, total)
    report(<Info uid="200" key="progress">
      <Text>
        {`download ${now} / ${total} bytes (${Math.floor(now / (Date.now() - begin))} kb/s) ${(100*now/total).toFixed(2)}%`}
      </Text>
    </Info>)
  })
  .then((res) => {
    bigfile = res.path()
    return fs.stat(bigfile)
  })
  .then((stat) => {
    report(<Info key="big file stat">
      <Text>{JSON.stringify(stat)}</Text>
    </Info>)
    let task = RNFetchBlob.fetch('POST', 'https://content.dropboxapi.com/2/files/upload', {
      Authorization : `Bearer ${DROPBOX_TOKEN}`,
      'Dropbox-API-Arg': '{\"path\": \"/rn-upload/'+filename+Date.now()+'\",\"mode\": \"add\",\"autorename\": true,\"mute\": false}',
      'Content-Type' : 'application/octet-stream',
    }, RNFetchBlob.wrap(bigfile))
    begin = -1
    task.uploadProgress((now, total) => {
      upload = true
      if(begin === -1)
        begin = Date.now()
      if(Date.now() - deb < 1000)
        return
      deb = Date.now()
      console.log('upload', now, total)
      report(<Info uid="300" key="upload progress">
        <Text>
          {`upload ${now} / ${total} bytes (${Math.floor(now / (Date.now() - begin))} kb/s) ${(100*now/total).toFixed(2)}%`}
        </Text>
      </Info>)
    })
    return task
  })
  .then(() => {
    report(<Assert key="upload and download event triggered" expect={true} actual={download && upload}/>)
    done()
  })
})

describe('cancel task should work properly', (report, done) => {
  let filename = Platform.OS+'-0.7.0-cancel-test-22mb-dummy-' + Date.now()
  let bytesWitten = 0
  let deb = Date.now()
  let begin = -1
  let task =  RNFetchBlob.fetch('POST', 'https://content.dropboxapi.com/2/files/upload', {
    Authorization : `Bearer ${DROPBOX_TOKEN}`,
    'Dropbox-API-Arg': '{\"path\": \"/rn-upload/'+filename+'\",\"mode\": \"add\",\"autorename\": true,\"mute\": false}',
    'Content-Type' : 'application/octet-stream',
  }, RNFetchBlob.wrap(bigfile))

  task.uploadProgress((now, total) => {
    bytesWitten = now
    if(Date.now() - deb < 1000)
      return
    deb = Date.now()
    if(begin === -1)
      begin = Date.now()
    let speed = Math.floor(now / (Date.now() - begin))
    report(<Info uid="100"  key="progress">
      <Text>
        {`upload ${now} / ${total} bytes (${speed} kb/s)`}
        {` ${Math.floor((total-now)/speed/1000)} seconds left`}
      </Text>
    </Info>)
  })

  let checkpoint1 = 0
  Timer.setTimeout(() => {
    task.cancel()
  }, 5000)
  Timer.setTimeout(() => {
    checkpoint1 = bytesWitten
  }, 6000)
  Timer.setTimeout(() => {
    report(<Assert key="data should not write to stream after task is canceled"
      expect={checkpoint1}
      actual={bytesWitten}/>)
    fs.unlink(bigfile).then(() => {
      done()
    })
  }, 10000)

  task
    .then((res) => {
      report(
        <Assert key="task not canceled"
          expected={false}
          actual={true}/>)
    })
    .catch((resp) => {
      report(<Assert key="task cancelled rejection should be catachable"
        expect={true}
        actual={true}/>)
      done()
    })

})
